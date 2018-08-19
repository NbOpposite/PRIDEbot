#!/usr/bin/node
require('./extensions');
const commando = require('discord.js-commando');
const plugins = require('discord.js-plugins');
const path = require('path');
const oneLine = require('common-tags').oneLine;
const token = require('../secrets').discordToken;
const { dbPromise } = require('./db');
const config = require('../config');

const bot = module.exports = new commando.CommandoClient({
  owner: config.owners,
  commandPrefix: config.prefix,
  unknownCommandResponse: false,
  disableEveryone: true,
});

plugins.inject(bot);

bot
  .on('error', console.error)
  .on('warn', console.warn)
  .on('debug', msg=>console.log(msg.replace(token,'<TOKEN>')))
  .on('ready', () => {
    console.log(`Client ready; logged in as ${bot.user.username}#${bot.user.discriminator} - (${bot.user.id})`);
  })
  .on('disconnect', () => { console.warn('Disconnected!'); })
  .on('reconnecting', () => { console.warn('Reconnecting...'); })
  .on('commandError', (cmd, err) => {
    if(err instanceof commando.FriendlyError) return;
    console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
  })
  .on('commandBlocked', (msg, reason) => {
    console.log(oneLine`
      Command ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''}
      blocked; ${reason}
    `);
  })
  .on('commandPrefixChange', (guild, prefix) => {
    console.log(oneLine`
      Prefix ${prefix === '' ? 'removed' : `changed to ${prefix || 'the default'}`}
      ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
    `);
  })
  .on('commandStatusChange', (guild, command, enabled) => {
    console.log(oneLine`
      Command ${command.groupID}:${command.memberName}
      ${enabled ? 'enabled' : 'disabled'}
      ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
    `);
  })
  .on('groupStatusChange', (guild, group, enabled) => {
    console.log(oneLine`
      Group ${group.id}
      ${enabled ? 'enabled' : 'disabled'}
      ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
    `);
  })
  .on('raw', async event => {
    if(event.t !== 'MESSAGE_REACTION_ADD') return;
    const { d: data } = event;
    const user = bot.users.get(data.user_id);
    const channel = bot.channels.get(data.channel_id) || await user.createDM();

    if (channel.messages.has(data.message_id)) return;

    const message = await channel.messages.fetch(data.message_id);

    const emojiKey = (data.emoji.id) ? data.emoji.id : data.emoji.name;
    const reaction = message.reactions.get(emojiKey);
    bot.emit('messageReactionAdd', reaction, user);

  });

bot.setProvider(
  dbPromise.then(db => new commando.SQLiteProvider(db))
).catch(console.error);

bot.registry
  .registerDefaultTypes()
  .registerDefaultGroups()
  .registerGroup('jokes', 'Jokes')
  .registerGroup('privacy', 'Privacy')
  .registerGroup('mod', 'Moderator')
  .registerDefaultCommands({
    'prefix': false,
  })
  .registerTypesIn(path.join(__dirname, 'types'))
  .registerCommandsIn(path.join(__dirname, 'commands'));
bot.plugins
  .registerGroup('ipc', 'IPC')
  .registerGroup('privacy', 'Privacy')
  .registerGroup('jokes', 'Jokes')
  .registerGroup('util', 'Util')
  .registerGroup('media', 'Media')
  .registerGroup('security', 'Security')
  .loadPluginsIn(path.join(__dirname, 'plugins'));

bot.login(token);

//require('./jokes/banned');
//require('./jokes/cultTracker');
