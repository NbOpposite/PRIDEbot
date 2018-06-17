const bot = require('../../bot');
const commando = require('discord.js-commando');
const db = require('../../db');
const config = require('../../config');
const { stripIndents, oneLine } = require('common-tags');
const emoji = new (require('discord.js').Emoji)(bot, config.twEmoji);

module.exports = class TwCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: 'tw',
      aliases: ['trigger', 'cw'],
      group: 'util',
      memberName: 'tw',
      description: 'Hides the message and require user interaction to view it',
      examples: ['tw I stubbed my toe on a table', 'tw \\`physical harm` I stubbed my toe on a table'],
      guildOnly: true,
      defaultHandling: true,
      format: '[`subject`] <message>',
    });
  }
  async run(msg, args) {
    await msg.delete();
    const match = args.match(/\s*(?:(``?)(.*?)\1)?\s*(.*)/);
    const subject = match[2];
    const text = match[3];

    const response = await msg.channel.send(
      stripIndents`
      ${msg.author} sent a message that may be triggering.
      Click ${emoji} to have the message sent in PM ${
        subject ? `\n\nSubject of the message is: ${subject}` : ''
      }`,
      { reply: null }
    );

    db().run("INSERT INTO trigger_warnings (message_id, text) VALUES (?, ?)", response.id, text);

    await response.react(emoji.reactionString);
  }
};

/*
module.exports = {
  run,
  shortInfo,
  helpString,
}*/