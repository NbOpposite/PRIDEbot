const { Plugin } = require('discord.js-plugins');
const { stripIndents } = require('common-tags');
const arrayToSentence = require('array-to-sentence');
class NewMember extends Plugin {
  constructor(client) {
    const info = {
      name: 'newMember',
      group: 'util',
      description: 'Elevates new members to regular members after certain parameters are set',
      guarded: true
    };
    super(client, info);
  }

  async start() {
    this.client.on('guildMemberUpdate', (...args) => this.onGuildMemberUpdate(...args));
    this.client.on('guildMemberRemove', (...args) => this.onGuildMemberRemove(...args));
    this.client.on('message', (...args) => this.onMessage(...args));
  }

  getNewChannels(guild) {
    const newUserConf = guild.settings.get('newUserConfig');
    const newRole = guild.roles.get(newUserConf.newRole);
    const regularRole = guild.roles.get(newUserConf.regularRole);
    return guild.channels.filter(channel => {
      if(!['text','voice'].includes(channel.type)) return false;
      if(newRole.permissionsIn(channel).has('VIEW_CHANNEL')) return false;
      if(!regularRole.permissionsIn(channel).has('VIEW_CHANNEL')) return false;
      return true;
    }).map(c=>`${c.type==='text'?'#':'🔊'}${c.name}`);
  }

  getLostChannels(guild) {
    const newUserConf = guild.settings.get('newUserConfig');
    const newRole = guild.roles.get(newUserConf.newRole);
    const regularRole = guild.roles.get(newUserConf.regularRole);
    return guild.channels.filter(channel => {
      if(!['text','voice'].includes(channel.type)) return false;
      if(!newRole.permissionsIn(channel).has('VIEW_CHANNEL')) return false;
      if(regularRole.permissionsIn(channel).has('VIEW_CHANNEL')) return false;
      return true;
    }).map(c=>`${c.type==='text'?'#':'🔊'}${c.name}`);
  }

  async onMessage(message) {
    if(!message.member) return;
    if(!message.guild) return;
    const guild = message.guild;
    const newUserConf = guild.settings.get('newUserConfig');
    if(!newUserConf || !newUserConf.enabled) return;
    const newUsers = guild.settings.get('newUsers', {});
    if(!message.member.roles.has(newUserConf.newRole)) {
      if(newUsers.hasOwnProperty(message.author.id)) {
        delete newUsers[message.author.id];
        guild.settings.set('newUsers', newUsers);
      }
      return;
    }
    let newUser = newUsers[message.author.id];
    if(!newUser) {
      newUser = newUsers[message.author.id] = {
        messages: 0,
        joined: new Date().getTime()
      };
      this.client.emit('warn', stripIndents`
      PRIDEbot failed to detect when \`\`${message.author.tag}\`\` got the new-role in \`\`${guild.name}\`\`.
      Setting count to 0, and starting time to now.`);
    }
    newUser.messages++;
    const curTime = new Date().getTime();
    const newUsersHold = guild.settings.get('newUsersHold', []);
    if(newUser.messages >= newUserConf.messageThreshold
      && curTime - newUser.joined > newUserConf.timeThreshold
      && !newUsersHold.includes(message.author.id)) {
      delete newUsers[message.author.id];
      guild.settings.set('newUsers', newUsers);
      await message.member.roles.add(newUserConf.regularRole);
      await message.member.roles.remove(newUserConf.newRole);
      const newChannels = this.getNewChannels(guild);
      const lostChannels = this.getLostChannels(guild);
      message.author.send(stripIndents`Congratulations, you're now a full member of ${guild.name}!
      ${newChannels.length?`You can now access ${arrayToSentence(newChannels)}`:''}!
      ${lostChannels.length?`However, you will no longer have access to ${arrayToSentence(lostChannels)}`:''}`);
      return;
    }
    guild.settings.set('newUsers', newUsers);
  }

  onGuildMemberUpdate(oldMember, newMember) {
    const guild = (oldMember.guild || newMember.guild);
    const newUserConf = guild.settings.get('newUserConfig');
    if(!newUserConf || !newUserConf.enabled) return;
    if(oldMember.roles.has(newUserConf.newRole)) return;
    if(!newMember.roles.has(newUserConf.newRole)) return;
    const newUsers = guild.settings.get('newUsers', {});
    newUsers[newMember.id] = {joined: new Date().getTime(), messages: 0};
    guild.settings.set('newUsers', newUsers);
  }

  onGuildMemberRemove(member) {
    const guild = member.guild;
    const newUsers = guild.settings.get('newUsers', {});
    if(newUsers.hasOwnProperty(member.id)) {
      delete newUsers[member.id];
      guild.settings.set('newUsers', newUsers);
    }
  }
}

module.exports = NewMember;