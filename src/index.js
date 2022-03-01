'use-strict';

export default class Monitor {
  static socket;

  constructor() {
    this.start();
  }

  async start() {

    // configure socket
    console.log('Configuring socket...');
    this.socket = new (await import('./controllers/socket.controller.js')).default();

    // console.log(this.socket);
  }
}

new Monitor();
