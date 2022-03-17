'use-strict';

import { EventEmitter } from 'events'

export default class Monitor extends EventEmitter {
  #server
  #socket

  constructor() {
    super();

    this.start();
  }

  async start() {

    // configure http server
    console.log('Configuring http server...')
    this.#server = new (await import('./controllers/server.controller.js')).default();

    // configure socket
    console.log('Configuring socket...')
    this.#socket = new (await import('./controllers/socket.controller.js')).default(this.#server);

    // start the web interface
    // console.log(this.#server.listen)
    this.#server.listen(1608)
  }
}
