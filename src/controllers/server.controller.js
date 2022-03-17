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

		app.use(express.static(path.join(__dirname, '../../monitor')))

		const server = http.createServer(app)

		server.on('listening', async() => {
			console.log(server.address())
		})

		return server
	}
}
