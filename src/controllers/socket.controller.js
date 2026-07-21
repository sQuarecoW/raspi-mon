import { Server } from "socket.io"
import { exec } from "child_process"

import si from "systeminformation"

// Parse the *second* frame of `top -bn2` output. top computes instantaneous
// CPU by diffing two samples (like htop), so the values match `top`/`htop` and
// there is no newborn-process artifact. Default columns are:
//   PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
function parseTop(stdout) {
	const lines = stdout.split("\n")

	// The output holds two frames; take the rows after the *last* header line.
	let start = -1
	for (let i = 0; i < lines.length; i++) {
		if (/^\s*PID\s+USER.+%CPU/.test(lines[i])) start = i + 1
	}
	if (start < 0) return []

	return lines
		.slice(start)
		.map((line) => line.trim().split(/\s+/))
		.filter((p) => /^\d+$/.test(p[0]) && p.length >= 12)
		.map((p) => ({
			pid: p[0],
			cpu: parseFloat(p[8]),
			memory: parseFloat(p[9]),
			name: p.slice(11).join(" "),
		}))
		.filter((p) => !isNaN(p.cpu))
		.sort((a, b) => b.cpu - a.cpu)
		.slice(0, 10)
		.map((p) => ({
			name: p.name,
			cpu: p.cpu.toFixed(2),
			memory: p.memory.toFixed(2),
			pid: p.pid,
		}))
}

// macOS (dev only): BSD `ps` sorted by CPU. Its %cpu is a lifetime average, so
// we drop the just-spawned `ps` process itself (its ratio spikes past 100%).
function parsePs(stdout) {
	return stdout
		.trim()
		.split("\n")
		.map((line) => line.trim().split(/\s+/))
		.filter((p) => /^\d+$/.test(p[0]))
		.filter((p) => p[3] !== "ps")
		.slice(0, 10)
		.map(([pid, cpu, mem, ...name]) => ({
			name: name.join(" "),
			cpu: parseFloat(cpu).toFixed(2),
			memory: parseFloat(mem).toFixed(2),
			pid,
		}))
}

export default class SocketController {
	static #memoryUsage = [];
	static #cpuUsage = [];
	static #temp = [];
	static #disk = null;

    static io;

    constructor(server) {
		console.log("new socketcontroller")
        SocketController.io = new Server(server, {
            cors: {
                origin: "*",
				methods: ["GET", "POST"]
            },
        });

		SocketController.io.on("connection", (socket) => {
			// console.log("connection");

			// Send the buffered history once, so a fresh client draws a full
			// chart immediately. After this it only receives single new points.
			socket.emit("cpu:init", SocketController.#cpuUsage);
			socket.emit("memory:init", SocketController.#memoryUsage);
			socket.emit("temp:init", SocketController.#temp);
			// Disk polls slowly (30s); give the first client a value right away.
			if (SocketController.#disk) socket.emit("disk", SocketController.#disk);
			else SocketController.getDiskUsage();

			socket.on("getSystemInfo", () => {
				// console.log("getSystemInfo");
				SocketController.systemInfo();
			});
		});

		SocketController.monitorSystem();
		SocketController.monitorProcesses();
		SocketController.monitorDisk();
		SocketController.systemTime();

		return SocketController.io;
    }

	static async systemInfo() {
		// console.log("systemInfo")

		const systemValues = {
			osInfo: 'distro, codename, release, hostname',
			system: "model, manufacturer",
			networkInterfaces: "(default) iface, ip4"
		}

		si.get(systemValues)
			.then( (data) => {
				SocketController.io.emit("systemInfo", data);
			})
	}

	// Cheap /proc reads (memory, CPU load, temperature) refresh quickly...
	static #FAST_INTERVAL = 2000;
	// ...and the process list (a lightweight `top -bn2`, ~0.5s to sample) now
	// refreshes almost as often.
	static #PROCESS_INTERVAL = 3000;

	static async monitorSystem() {
		// Only do the polling while someone is actually watching the dashboard.
		// On an idle Pi with no browser connected this keeps the process free.
		if (SocketController.io.engine.clientsCount > 0) {
			// Guard every cycle: a single failing sensor (e.g. an unavailable
			// native temperature module) must never take the whole loop down.
			try {
				await SocketController.getMemoryUsage()
				await SocketController.getCpuUsage()
				await SocketController.getCpuTemp()
			} catch (error) {
				console.error('monitorSystem cycle failed:', error)
			}
		}

		setTimeout(() => {
			SocketController.monitorSystem();
		}, SocketController.#FAST_INTERVAL);
	}

	static async monitorProcesses() {
		// si.processes() enumerates every process via `ps`; keep it on a slow
		// cadence so it doesn't dominate CPU on a Raspberry Pi.
		if (SocketController.io.engine.clientsCount > 0) {
			try {
				await SocketController.getProcessList()
			} catch (error) {
				console.error('monitorProcesses cycle failed:', error)
			}
		}

		setTimeout(() => {
			SocketController.monitorProcesses();
		}, SocketController.#PROCESS_INTERVAL);
	}

	// Disk usage changes slowly, so poll it rarely.
	static #DISK_INTERVAL = 30000;

	static async monitorDisk() {
		if (SocketController.io.engine.clientsCount > 0) {
			try {
				await SocketController.getDiskUsage()
			} catch (error) {
				console.error('monitorDisk cycle failed:', error)
			}
		}

		setTimeout(() => {
			SocketController.monitorDisk();
		}, SocketController.#DISK_INTERVAL);
	}

	static systemTime() {
		if (SocketController.io.engine.clientsCount > 0) {
			SocketController.io.emit("systemTime", si.time());
		}

		setTimeout(() => {
			SocketController.systemTime();
		}, 1000);
	}

	static async getMemoryUsage() {
		// console.log("Nova")
		si.mem()
			.then((data) => {
				const mem = {
					total: data.total,
					used: data.used,
					// `available` is the kernel's reclaimable-aware figure (MemAvailable):
					// total - available is real usage, excluding reclaimable disk cache.
					available: data.available,
					active: data.active,
					buffcache: data.buffcache,
					time: Date.now()
				}
				SocketController.#memoryUsage.push(mem)
				SocketController.#memoryUsage = SocketController.#memoryUsage.slice(-50)

				// Broadcast just the new point; new clients get the history via
				// the "memory:init" snapshot on connect.
				SocketController.io.emit("memory", mem)
			})
			.catch((error) => console.error(error));
	}

	static async getCpuUsage() {
		// console.log("Nova")
		si.currentLoad()
			.then((data) => {
				const cpu = {
					currentLoad: data.currentLoad,
					time: Date.now()
				}
				SocketController.#cpuUsage.push(cpu)
				SocketController.#cpuUsage = SocketController.#cpuUsage.slice(-50)

				SocketController.io.emit("cpu", cpu)
			})
			.catch((error) => console.error(error));
	}

	static async getCpuTemp() {
		// console.log("Nova")
		si.cpuTemperature()
			.then((data) => {
				// console.log(data)
				const temp = {
					main: data.main,
					time: Date.now()
				}
				SocketController.#temp.push(temp)
				SocketController.#temp = SocketController.#temp.slice(-50)

				SocketController.io.emit("temp", temp)
			})
			.catch((error) => console.error(error));
	}

	static async getDiskUsage() {
		si.fsSize()
			.then((data) => {
				// The root filesystem is what people mean by "disk"; fall back to
				// the largest mount if "/" isn't reported.
				const root =
					data.find((d) => d.mount === "/") ||
					data.slice().sort((a, b) => b.size - a.size)[0]
				if (!root) return

				const disk = {
					total: root.size,
					used: root.used,
					available: root.available,
					use: root.use, // percent (0-100)
					mount: root.mount,
					time: Date.now()
				}
				SocketController.#disk = disk
				SocketController.io.emit("disk", disk)
			})
			.catch((error) => console.error(error));
	}

	static getProcessList() {
		// On the Pi, use `top -bn2` for instantaneous, top/htop-matching CPU%
		// (it diffs two samples). LC_ALL=C keeps the numbers dot-decimal and the
		// columns predictable. macOS has a different top, so dev falls back to ps.
		const isDarwin = process.platform === "darwin"
		const cmd = isDarwin
			? "ps -Ac -o pid,pcpu,pmem,comm -r"
			: "LC_ALL=C top -bn2 -d 0.5 -w 512"

		exec(cmd, { timeout: 8000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
			if (error) {
				console.error(error)
				return
			}

			const list = isDarwin ? parsePs(stdout) : parseTop(stdout)
			SocketController.io.emit("processList", list)
		})
	}
}

