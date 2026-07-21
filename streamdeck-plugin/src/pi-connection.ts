import { io, type Socket } from "socket.io-client";

/**
 * The latest values we care about from a raspi-mon server. Mirrors the
 * socket.io events the dashboard uses:
 *   cpu / cpu:init        -> { currentLoad, time }
 *   memory / memory:init  -> { used, total, ... }
 *   temp / temp:init      -> { main, time }   (main is null when no sensor)
 *   systemTime            -> { uptime, ... }
 *   systemInfo            -> { osInfo: { hostname }, ... }
 */
export type PiData = {
	connected: boolean;
	cpu?: number; // %
	memPercent?: number; // %
	memUsed?: number; // bytes
	memTotal?: number; // bytes
	temp?: number | null; // °C (null = no sensor)
	uptime?: number; // seconds
	hostname?: string;
};

type Listener = (data: PiData) => void;

/**
 * One shared connection to a single raspi-mon server. Multiple buttons that
 * point at the same host reuse it; it closes itself when the last button
 * pointing at it disappears.
 */
class PiConnection {
	readonly url: string;
	private readonly socket: Socket;
	private readonly listeners = new Set<Listener>();
	private data: PiData = { connected: false };

	constructor(url: string) {
		this.url = url;
		this.socket = io(url, {
			transports: ["websocket", "polling"],
			reconnection: true,
			reconnectionDelayMax: 10_000,
			timeout: 8_000,
		});

		this.socket.on("connect", () => {
			this.data.connected = true;
			this.socket.emit("getSystemInfo");
			this.push();
		});
		this.socket.on("disconnect", () => {
			this.data.connected = false;
			this.push();
		});
		this.socket.on("connect_error", () => {
			this.data.connected = false;
			this.push();
		});

		// The server streams a history array once (":init") then single points.
		const last = <T>(v: T[] | T): T => (Array.isArray(v) ? v[v.length - 1] : v);

		this.socket.on("cpu:init", (rows) => this.onCpu(last(rows)));
		this.socket.on("cpu", (row) => this.onCpu(row));
		this.socket.on("memory:init", (rows) => this.onMem(last(rows)));
		this.socket.on("memory", (row) => this.onMem(row));
		this.socket.on("temp:init", (rows) => this.onTemp(last(rows)));
		this.socket.on("temp", (row) => this.onTemp(row));
		this.socket.on("systemTime", (t) => {
			if (t && typeof t.uptime === "number") {
				this.data.uptime = t.uptime;
				this.push();
			}
		});
		this.socket.on("systemInfo", (info) => {
			const hostname = info?.osInfo?.hostname;
			if (hostname) {
				this.data.hostname = hostname;
				this.push();
			}
		});
	}

	private onCpu(r?: { currentLoad?: number }): void {
		if (r && typeof r.currentLoad === "number") {
			this.data.cpu = r.currentLoad;
			this.push();
		}
	}

	private onMem(r?: { used?: number; total?: number; available?: number }): void {
		if (r && typeof r.total === "number" && r.total > 0) {
			// Real usage excludes reclaimable disk cache: total - available
			// (matches `free`/top). Fall back to `used` if available is absent.
			const used = typeof r.available === "number" ? r.total - r.available : r.used;
			if (typeof used !== "number") return;
			this.data.memUsed = used;
			this.data.memTotal = r.total;
			this.data.memPercent = (used / r.total) * 100;
			this.push();
		}
	}

	private onTemp(r?: { main?: number | null }): void {
		if (r && "main" in r) {
			this.data.temp = r.main ?? null;
			this.push();
		}
	}

	private push(): void {
		for (const listener of this.listeners) listener(this.data);
	}

	/** Subscribe a button; returns an unsubscribe function. */
	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		listener(this.data); // deliver current state immediately
		return () => {
			this.listeners.delete(listener);
			if (this.listeners.size === 0) this.close();
		};
	}

	private close(): void {
		pool.delete(this.url);
		this.socket.close();
	}
}

const pool = new Map<string, PiConnection>();

/** Get (or lazily create) the shared connection for a raspi-mon URL. */
export function getConnection(url: string): PiConnection {
	let connection = pool.get(url);
	if (!connection) {
		connection = new PiConnection(url);
		pool.set(url, connection);
	}
	return connection;
}
