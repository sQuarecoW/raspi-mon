'use-strict'

import { Server } from "socket.io"
import { exec } from "child_process"
import { byValue, byNumber } from 'sort-es'

import si from "systeminformation"
import { UniversalSpeedtest, SpeedUnits } from 'universal-speedtest'

const universalSpeedtest = new UniversalSpeedtest({
	measureUpload: true
})

export default class SocketController {
	static #speedTests = [];
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
			socket.on("getSpeedtest", () => {
				// console.log("getSystemInfo");
				// SocketController.runSpeedtest();
			});
		});

		SocketController.monitorSystem();
		SocketController.systemTime();

		// SocketController.runSpeedtest();

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

	static async monitorSystem() {
		// Only do the (relatively expensive) polling while someone is actually
		// watching the dashboard. On an idle Pi with no browser connected this
		// keeps the process essentially free.
		if (SocketController.io.engine.clientsCount > 0) {
			// Guard every cycle: a single failing sensor (e.g. an unavailable
			// native temperature module) must never take the whole loop down.
			try {
				await SocketController.getMemoryUsage()
				await SocketController.getCpuUsage()
				await SocketController.getCpuTemp()
				await SocketController.getProcessList()
				await SocketController.getProcessStatus()
			} catch (error) {
				console.error('monitorSystem cycle failed:', error)
			}
		}

		setTimeout(() => {
			SocketController.monitorSystem();
		}, 2000);
	}

	static systemTime() {
		if (SocketController.io.engine.clientsCount > 0) {
			SocketController.io.emit("systemTime", si.time());
		}

		setTimeout(() => {
			SocketController.systemTime();
		}, 1000);
	}

	static runSpeedtest() {
		// if there is already a speedtest, push the last one now
		if (SocketController.#speedTests.length > 0) {
			SocketController.io.emit("speedtest", SocketController.#speedTests[SocketController.#speedTests.length - 1])
		}

		console.log(SocketController.#speedTests)
		console.log("runSpeedtest")

		// do the speedtest, this will take quite a while
		universalSpeedtest.runSpeedtestNet()
			.then((results) => {
				// console.log(results)

				const result = {
					download: results.downloadSpeed,
					upload: results.uploadSpeed,
					latency: results.ping,
					time: Date.now(),
					userIP: results.client.ip
				}
				// console.log(result)
				SocketController.#speedTests.push(result);
				SocketController.io.emit("speedtest", result)
			})
			.catch((error) => {
				console.log(error)
			})

		setTimeout(() => {
			SocketController.runSpeedtest();
		}, 12*60*60*1000);
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

	static async getProcessStatus() {
		const processName = 'raspi-mon'

		si.processLoad(processName)
			.then((data) => {
				SocketController.io.emit(`process_${processName}`, data[0]);
			})
			.catch((error) =>  {
				console.log(error)
			})
	}
}

