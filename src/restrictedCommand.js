const commando = require('discord.js-commando');

module.exports = class RestrictedCommand extends commando.Command {
  constructor(client, opts) {
    const permGroup = opts.permGroup;
    opts.guildOnly = true;
    delete opts.permGroup;
    super(client, opts);

    this.permGroup = permGroup;
  }
  
  hasPermission(message, ownerOverride = true) {
    const superRes = super.hasPermission(message, ownerOverride);
    if(superRes !== true) return superRes;
    if(ownerOverride && this.client.isOwner(message.author)) return true;

    const perms = message.guild.settings.get('permissionRoles');
    if(!perms) return `The \`${this.name}\` command can only be used by members.`;
    if(!perms[this.permGroup]) return `The \`${this.name}\` command can only be used by members.`;
    const roles = Array.isArray(perms[this.permGroup])
      ? perms[this.permGroup]
      : [perms[this.permGroup]];

    for(const role of roles) {
      if(message.member.roles.has(role)) {
        return true;
      }
    }
    return `The \`${this.name}\` command can only be used by members.`;
  }
};
