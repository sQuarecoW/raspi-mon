#!/usr/bin/env node

process.title = 'raspi-mon'

import cluster from 'cluster'
import os from 'os'

import Monitor from '../src/index.js'

if (cluster.isPrimary) {
	console.log(`Primary process ${process.pid} is running`)

	// for (let i = 0; i < os.cpus().length; i++) {
	// 	cluster.fork()
	// }

	cluster.on('exit', (worker, code, signal) => {
		console.log(`worker ${worker.process.pid} died`)
		cluster.fork()
	})

	cluster.fork()
} else {
	new Monitor()
}

