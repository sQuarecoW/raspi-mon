'use-strict'

import http from 'http'
import express from 'express'
// import helmet from 'helmet'
import cors from 'cors'

import path from 'path'
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(path.dirname(import.meta.url));

const app = express()

export default class ServerController {
	constructor() {
		app.use(cors())
		app.use(express.json())
		app.use(express.urlencoded({ extended: true }))

		// New build-less vanilla + uPlot dashboard, served alongside the old one.
		app.use('/v2', express.static(path.join(__dirname, '../../web')))

		app.use(express.static(path.join(__dirname, '../../monitor')))

		const server = http.createServer(app)

		server.on('listening', async() => {
			console.log(`Raspi-mon interface is listening ... (port ${server.address().port})`)
		})

		return server
	}
}
