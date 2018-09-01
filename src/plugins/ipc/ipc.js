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
    this.server.router.addRoute('members', this.listMembers.bind(this));
    this.server.router.addRoute('roles', this.listRoles.bind(this));
    this.server.router.addRoute('me', this.getMe.bind(this));
  }

  async listMembers(req) {
    const login = await this.getGuildLogin(req, true);
    return (await login.guild.members.fetch()).map(e => {
      return {
        tag: e.user.tag,
        name: e.displayName,
        color: e.displayHexColor
      };
    });
  }

  async listRoles(req) {
    const login = await this.getGuildLogin(req, true);
    return login.guild.roles.sort((a,b) => b.position - a.position)
      .map(e => {
        return {
          id: e.id,
          name: e.name,
          color: e.hexColor,
          permissions: e.permissions.toArray()
        };
      });
  }

  async getMe(req) {
    if(!req.loginUser) throw new Error('You must be logged in to access this.');
    const user = await this.client.users.fetch(req.loginUser)
      .catch(() => {throw new Error('Invalid login user provided.');});
    const guilds = {};
    const globalGroups = new Set();
    let isGlobalMember = false;
    for (let [, guild] of this.client.guilds) {
      let member;
      try {
        member = await guild.members.fetch(user);
      } catch (err) {
        continue;
      }
      const guildInfo = {name: guild.name, id: guild.id, groups: [], member: false};
      const permGroups = guild.settings.get('permissionRoles', {});
      for (const group in permGroups) {
        const roles = Array.isArray(permGroups[group]) ? permGroups[group] : [permGroups[group]];
        for (const role of roles) {
          if (!member.roles || !member.roles.has(role)) continue;

          guildInfo.groups.push(group);
          globalGroups.add(group);
          if (group === 'Member') {
            isGlobalMember = true;
            guildInfo.member = true;
          }
        }
      }
      guilds[guild.id] = guildInfo;
    }
    return {
      owner: this.client.isOwner(user),
      member: isGlobalMember,
      groups: [...globalGroups],
      guilds,
    };
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
    
    if(!(ownerBypass && this.client.isOwner(user)) && !groups.includes('Member')) {
      throw new Error('You must be a member of the server to fetch its members.');
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
