import { Server } from "socket.io"
import { byValue, byNumber } from 'sort-es'

import si from "systeminformation"

export default class SocketController {
	static #memoryUsage = [];
	static #cpuUsage = [];
	static #temp = [];

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

			socket.on("getSystemInfo", () => {
				// console.log("getSystemInfo");
				SocketController.systemInfo();
			});
		});

		SocketController.monitorSystem();
		SocketController.monitorProcesses();
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
	// ...but the process list needs a full `ps` sweep, which is by far the most
	// expensive call on a Pi, so it refreshes much less often.
	static #PROCESS_INTERVAL = 8000;

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

	static async getProcessList() {
		si.processes()
			.then((processes) =>  {
				const topTen = processes
								.list
								.sort(byValue(p => p.cpu, byNumber({desc : true})))
								.slice(0, 6)
								.map(p => {
									return {
										name: p.name,
										cpu: parseFloat(p.cpu).toFixed(2),
										memory: parseFloat(p.mem).toFixed(2),
										pid: p.pid,
										path: p.path
									}
								})

				SocketController.io.emit('processList', topTen)
			})
			.catch((error) =>  {
				console.log(error)
			})
	}
}

