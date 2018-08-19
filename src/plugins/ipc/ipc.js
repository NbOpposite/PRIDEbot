const { Plugin } = require('discord.js-plugins');
const { Server } = require('node-ipc-requests');

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
    this.server.router.addRoute('members', async (req) => {
      const login = await this.getGuildLogin(req, true);
      return (await login.guild.members.fetch()).map(e => {
        return {
          tag: e.user.tag,
          name: e.displayName,
          color: e.displayHexColor
        };
      });
    });
  }

  async getGuildLogin(req, ownerBypass = false) {
    let guild;
    try {
      guild = this.client.guilds.get(req.guild);
    } catch (err) {
      throw new Error('Invalid guild');
    }
    if(!guild) {
      throw new Error('Invalid guild');
    }
    if(!req.loginUser) throw new Error('You must be logged in to access this.');
    const user = await this.client.users.fetch(req.loginUser)
      .catch(() => {throw new Error('Invalid login user provided.');});
    const member = await guild.members.fetch(req.loginUser)
      .catch(() => {
        if(ownerBypass && this.client.isOwner(user)) {
          return null;
        } else {
          throw new Error('You must be a member of the server to fetch its members.');
        }
      });
    const groups = [];
    if(member) {
      const permRoles = guild.settings.get('permissionRoles', {});
      for(const group in permRoles) {
        const roles = Array.isArray(permRoles[group])
          ? permRoles[group]
          : [permRoles[group]];
        for(const role of roles) {
          if (member.roles.has(role)) {
            groups.push(group);
            continue;
          }
        }
      }
    }
    return {
      member,
      user,
      groups,
      permissions: member ? member.permissions : null,
      owner: this.client.isOwner(member),
      guild
    };
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