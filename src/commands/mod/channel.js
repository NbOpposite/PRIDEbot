const RestrictedCommand = require('../../restrictedCommand');

module.exports = class StatsCommand extends RestrictedCommand {
  constructor(client) {
    super(client, {
      name: 'channel',
      aliases: [],
      group: 'mod',
      memberName: 'channel',
      description: 'Gets stats from a server. Specified server can only be used by PRIDEverse moderators',
      examples: ['stats', 'stats dru'],
      guildOnly: true,
      clientPermissions: [],
      format: '[server]',
      permGroup: 'Moderator',
    });
  }
  async run(msg) {
    msg.reply('You\'re allowed to use this command \\o/');
  }
};
