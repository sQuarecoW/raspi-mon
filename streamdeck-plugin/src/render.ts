import type { PiData } from "./pi-connection";

export type Metric = "cpu" | "memory" | "temp" | "uptime";

/** Linear interpolate between two #rrggbb colors. */
function lerpColor(a: string, b: string, t: number): string {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
	return `#${p.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** 0 -> green, 0.5 -> amber, 1 -> red. */
function heat(fraction: number): string {
	const f = Math.max(0, Math.min(1, fraction));
	return f < 0.5 ? lerpColor("#22c55e", "#f59e0b", f / 0.5) : lerpColor("#f59e0b", "#ef4444", (f - 0.5) / 0.5);
}

function bytesToGB(n: number): string {
	return `${(n / 1024 ** 3).toFixed(1)}G`;
}

function uptimeShort(seconds: number): string {
	const s = Math.floor(seconds);
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (d) return `${d}d ${h}h`;
	if (h) return `${h}h ${m}m`;
	return `${m}m`;
}

const TEXT = "#e6e9ee";
const MUTED = "#8a95a3";
const BG = "#12161b";

/** Wrap an SVG string into a Stream Deck-ready image data URI. */
function svgToImage(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

type Rendered = { image: string; title: string };

/**
 * Build the button face for a metric. Everything is drawn in the SVG (the
 * title is kept empty so it doesn't overlap the artwork). 144x144 is the
 * Stream Deck key render size.
 */
export function render(metric: Metric, data: PiData, host?: string): Rendered {
	// Which Pi this button is for: prefer the name the Pi reports, fall back to
	// the configured host, and drop a trailing ".local" for brevity.
	const hostLabel = (data.hostname || host || "").replace(/\.local$/, "");

	if (!data.connected) return { image: card({ host: hostLabel, label: label(metric), big: "—", sub: "offline", accent: "#4b535d", muted: true }), title: "" };

	switch (metric) {
		case "cpu": {
			const v = data.cpu;
			if (v == null) return waiting(metric, hostLabel);
			return { image: card({ host: hostLabel, label: "CPU", big: `${Math.round(v)}%`, accent: heat(v / 100), bar: v / 100 }), title: "" };
		}
		case "memory": {
			const v = data.memPercent;
			if (v == null) return waiting(metric, hostLabel);
			const sub = data.memUsed != null && data.memTotal != null ? `${bytesToGB(data.memUsed)}/${bytesToGB(data.memTotal)}` : undefined;
			return { image: card({ host: hostLabel, label: "MEM", big: `${Math.round(v)}%`, sub, accent: heat(v / 100), bar: v / 100 }), title: "" };
		}
		case "temp": {
			const v = data.temp;
			if (v == null) return { image: card({ host: hostLabel, label: "TEMP", big: "n/a", accent: MUTED, muted: true }), title: "" };
			// Map ~30–85°C onto the heat scale.
			const frac = (v - 30) / (85 - 30);
			return { image: card({ host: hostLabel, label: "TEMP", big: `${Math.round(v)}°`, accent: heat(frac), bar: frac }), title: "" };
		}
		case "uptime": {
			const up = data.uptime != null ? uptimeShort(data.uptime) : "—";
			return { image: card({ host: hostLabel, label: "UPTIME", big: up, accent: "#3b82f6" }), title: "" };
		}
	}
}

function waiting(metric: Metric, host: string): Rendered {
	return { image: card({ host, label: label(metric), big: "…", accent: MUTED, muted: true }), title: "" };
}

function label(metric: Metric): string {
	return { cpu: "CPU", memory: "MEM", temp: "TEMP", uptime: "UPTIME" }[metric];
}

function truncate(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Draw a single button face. */
function card(opts: { host?: string; label: string; big: string; sub?: string; accent: string; bar?: number; muted?: boolean }): string {
	const { host, label, big, sub, accent, bar, muted } = opts;
	const bigSize = big.length >= 6 ? 30 : big.length >= 4 ? 40 : 48;
	const bigY = sub ? 86 : 94;
	const hostRow = host ? `<text x="72" y="21" fill="${MUTED}" font-size="12" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,sans-serif">${escapeXml(truncate(host, 17))}</text>` : "";
	const barRow =
		bar != null
			? `<rect x="18" y="120" width="108" height="10" rx="5" fill="#242c34"/>
			   <rect x="18" y="120" width="${Math.max(0, Math.min(108, 108 * bar))}" height="10" rx="5" fill="${accent}"/>`
			: "";
	const subRow = sub ? `<text x="72" y="108" fill="${MUTED}" font-size="14" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,sans-serif">${escapeXml(sub)}</text>` : "";
	return svgToImage(`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
	<rect width="144" height="144" rx="18" fill="${BG}"/>
	<rect x="0" y="0" width="144" height="6" fill="${accent}"/>
	${hostRow}
	<text x="72" y="46" fill="${muted ? MUTED : accent}" font-size="15" letter-spacing="1.4" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-weight="600">${escapeXml(label.toUpperCase())}</text>
	<text x="72" y="${bigY}" fill="${TEXT}" font-size="${bigSize}" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-weight="700">${escapeXml(big)}</text>
	${subRow}
	${barRow}
</svg>`);
}

function escapeXml(s: string): string {
	return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string);
}
