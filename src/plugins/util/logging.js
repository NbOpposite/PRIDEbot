const { Plugin } = require('discord.js-plugins');
const { MessageEmbed } = require('discord.js');
const webhook = require('../../webhook');
const util = require('util');

const icons = {
  connection: 'https://i.imgur.com/dXkyAyo.png',
  info: 'https://i.imgur.com/GlSm2l7.png',
  ok: 'https://i.imgur.com/ZTWrj5E.png',
  warning: 'https://i.imgur.com/n6jK2k6.png',
  error: 'https://i.imgur.com/Q9X2fcS.png',
};

class Logging extends Plugin {
  constructor(client) {
    const info = {
      name: 'logging',
      group: 'util',
      description: 'Loggs warnings and errors trough a webhook',
      guarded: true
    };
    super(client, info);
  }

  async start() {
    this.client.on('error', (...args) => this.logError(...args));
    this.client.on('warn', (...args) => this.logWarn(...args));
    this.client.on('ready', (...args) => this.logReady(...args));
    this.client.on('disconnect', (...args) => this.logDisconnect(...args));
    this.client.on('reconnecting', (...args) => this.logReconnect(...args));
    this.client.on('commandError', (...args) => this.logCommandError(...args));
    this.client.on('commandBlocked', (...args) => this.logCommandBlocked(...args));
    this.client.on('pluginError', (...args) => this.logPluginError(...args));
    this.client.on('pluginFatal', (...args) => this.logPluginFatal(...args));
  }

  getTemplate (footerUrl = icons.info) {
    const embed = new MessageEmbed()
      .setFooter('Event logged from the Logging plugin', footerUrl)
      .setColor(0x3B88C3)
      .setTimestamp();
    if(this.client.user) embed.setAuthor(this.client.user.tag, this.client.user.avatarURL());
    else embed.setAuthor('Uninitialized Client');
    return embed;
  }

  getType(obj) {
    if(obj === null || obj === undefined) return String(obj);
    if(obj.constructor && obj.constructor.name) return obj.constructor.name;
    return typeof obj;
  }
  cropString(str, prefix = '', suffix = '') {
    str = String(str);
    const strlen = 1024-prefix.length-suffix.length;
    str = str.substring(0,strlen);
    if(str === '') str = '\u200b';
    return prefix+str+suffix;
  }

  inspectObj(name, obj, embed) {
    if(typeof obj !== 'string') embed.addField(`${name} - Inspect`, this.cropString(util.inspect(obj), '```\n', '\n```'));
    return embed;
  }

  inspection(name, obj, embed) {
    embed.addField(`${name} - Type`, this.cropString(this.getType(obj)), true);
    if(obj !== null || obj !== undefined) embed.addField(`${name} - String Value`, this.cropString(obj), true);
    return this.inspectObj(name, obj, embed);
  }

  logError(err) {
    const embed = this.getTemplate(icons.error);
    embed.setColor(0xFF0000)
      .setTitle('Client error')
      .setDescription('Discord client emitted an error');
    this.inspection('Error', err, embed);
    webhook.send(embed);
  }

  logWarn(warn) {
    const embed = this.getTemplate(icons.warning);
    embed.setColor(0xFFCC4D)
      .setTitle('Client warning')
      .setDescription('Discord client emitted a warning');
    this.inspection('Warn', warn, embed);
    
    webhook.send(embed);
  }

  logReady() {
    const embed = this.getTemplate(icons.ok);
    embed.setColor(0x76B255)
      .setTitle('Ready')
      .setDescription('The client is connected and ready');
    webhook.send(embed);
  }

  logDisconnect(event) {
    const embed = this.getTemplate(icons.connection);
    embed.setColor(0xFF0000)
      .setTitle('Disconnect')
      .setDescription('Discord client disconnected');
    this.inspection('Event',event, embed);
    webhook.send(embed);
  }

  logReconnect() {
    const embed = this.getTemplate(icons.connection);
    embed
      .setTitle('Reconnecting')
      .setDescription('The client is reconnecting');
    webhook.send(embed);
  }

  logCommandError(cmd, err, msg, args, pattern) {
    const embed = this.getTemplate(icons.error);
    embed.setColor(0xFF0000)
      .setTitle('Command error')
      .setDescription(`Error when executing a command${pattern?' triggered by regex pattern':''}`);
    this.inspection('Command', cmd, embed);
    this.inspection('Error', err, embed);
    this.inspection('Message', msg, embed);
    this.inspection('Args', args, embed);
    webhook.send(embed);
  }

  logCommandBlocked(msg, reason) {
    const embed = this.getTemplate();
    embed
      .setTitle('Command blocked')
      .setDescription('A command got blocked from executing')
      .addField('Command',  this.cropString(`${msg.command.group.name}:${msg.command.memberName}`), true)
      .addField('Reason', this.cropString(reason), true)
      .addField('User',  this.cropString(`${msg.author.tag} (${msg.author.id})`))
      .addField('Context',  this.cropString(`${msg.guild ? `${msg.guild.name} (#${msg.channel.name})` : 'DMs'}`))
      .addField('Message',  this.cropString(msg.content));
    webhook.send(embed);
  }

  logPluginError(plugin, err) {
    const embed = this.getTemplate(icons.error);
    embed.setColor(0xFF0000)
      .setTitle('Plugin error')
      .setDescription(`A plugin encountered a critical error and will be ${plugin.guarded?'reloaded':'unloaded'}.`);
    this.inspection('Plugin', plugin, embed);
    this.inspection('Error', err, embed);
    webhook.send(embed);
  }

  logPluginFatal(reason, err) {
    const embed = this.getTemplate(icons.error);
    embed.setColor(0xFF0000)
      .setTitle('Plugin fatal')
      .setDescription('The plugin manager encountered a fatal error, the bot will crash in 5 seconds.')
      .addField('Reason', this.cropString(reason));
    this.inspection('Error', err, embed);
    webhook.send(embed);
  }

  logSecurity(msg, mention) {
    const embed = this.getTemplate(icons.error);
    embed.setColor(0xFF0000)
      .setTitle('Security Issue')
      .setDescription(msg);
    if(mention) {
      webhook.client.send('<@!141977677404962816>', {embed});
    } else {
      webhook.client.send(embed);
    }
  }
}

module.exports = Logging;