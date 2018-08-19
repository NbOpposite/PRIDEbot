const { Plugin } = require('discord.js-plugins');
const { Server } = require('node-ipc-requests');

class NewError extends Error {}
Reflect.defineProperty(NewError.prototype, 'name', {
  get () {
    return this.constructor.name;
  }
});

class IpcPlugin extends Plugin {
  constructor(client) {
    const info = {
      name: 'IPC',
      group: 'ipc',
      description: 'Provides an IPC entrypoint into the bot',
      guarded: true
    };
    super(client, info);
    this.server = new Server('pridebot');
    this.server.router.addRoute('users', () => {
      return this.client.users.map(e => ({id: e.id, name: e.username}));
    });
  }

  async start() {
    console.log('STARTING IPC');
    try {
      await this.server.start();
      console.log('STARTED');
    } catch (err) {
      console.log('FAILED TO START', err);
    }
  }

  stop() {
    this.server.stop();
  }
}

module.exports = IpcPlugin;