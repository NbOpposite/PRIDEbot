const RestrictedCommand = require('../../restrictedCommand');

module.exports = class RoleCommand extends RestrictedCommand {
  constructor(client) {
    super(client, {
      name: 'role',
      aliases: [],
      group: 'util',
      memberName: 'role',
      description: 'Gives you the specified role. To get a list of all available roles, run this command with no arguments. If there are multiple roles with the same name, use `~<number>` to select which role you want',
      examples: ['role', 'role They/Them', 'role He/Him~2'],
      clientPermissions: ['MANAGE_ROLES'],
      format: '[role[~<number>]]',
      permGroup: 'Member',
    });
  }

  async listRoles(roles, msg) {
    const dupes = new Map();
    let str = 'List of available roles:\n';
    let maxLen = roles.reduce((acc, role) => Math.max(acc, role.name.length), 0);
    let hasDupe = false;
    for(const [,role] of roles) {
      const dupeString = (()=>{
        const dupe = dupes.get(role.name.toLowerCase());
        if(!dupe) {
          dupes.set(role.name.toLowerCase(), 2);
          return '';
        } else {
          hasDupe = true;
          dupes.set(role.name.toLowerCase(), dupe+1);
          return ` [duplicate name, to select this role use \`\`${role.name}~${dupe}\`\`]`;
        }
      })();
      str += `\`\`${role.name.padEnd(maxLen)}\u200b\`\`${msg.member.roles.has(role.id)?' `✅`':''}${dupeString}\n`;
    }
    str += '\nRoles marked with `✅` are roles you already have\n';
    if(hasDupe) {
      str += '\nDuplicate name exist in case you have a preference over which role color you want. You will get the color of the role with the highest position in the list.\n';
    }
    str += '\nAre we missing a role? Just ask a moderator to add it!\n';
    msg.reply(str, {split: true});
  }

  async assignRole(roles, msg, args) {
    const dupes = new Map();
    for(const [,role] of roles) {
      let roleArr = dupes.get(role.name.toLowerCase());
      if(!roleArr) dupes.set(role.name.toLowerCase(), roleArr = []);
      roleArr.push(role);
    }
    let [roleName, index] = args.split('~');
    roleName = roleName.trim();
    if(typeof index === 'string') index = index.trim();
    if(!dupes.has(roleName.toLowerCase())) return msg.reply(`Can't find role \`\`${roleName}\`\``);
    if(index === undefined || index === '') index = 1;
    if(!isFinite(index)) return msg.reply(`\`\`${index}\`\` is an invalid number`);
    index = Number(index);
    if(index < 1 || Math.round(index) !== index) return msg.reply('The role index must be a non-zero positive integer');
    index--;
    const roleArr = dupes.get(roleName.toLowerCase());
    if(index >= roleArr.length) return msg.reply(`Can't find role \`\`${roleName}~${index+1}\`\``);
    const role = roleArr[index];
    if(!msg.member.roles.has(role.id)) {
      msg.member.roles.add(role);
      return msg.reply(`Added role \`\`${role.name}\`\` to you`);
    } else {
      msg.member.roles.remove(role);
      return msg.reply(`Removed role \`\`${role.name}\`\` from you`);
    }
    
  }

  async run(msg, args) {
    if(!msg.guild) return;
    const guild = msg.guild;
    const roleLimits = guild.settings.get('selfRoleLimits');
    if(!roleLimits) return msg.reply('Server is not configured for self-roles');
    if(!Array.isArray(roleLimits)) return msg.reply('Self-role configuration is malconfigured');
    const [upper, lower] = roleLimits.map(role=>guild.roles.get(role)).filter(role=>role).sort((a,b)=>b.position-a.position);
    if(upper === undefined || lower === undefined) return msg.reply('Self-role configuration is malconfigured');
    const roles = guild.roles
      .filter(role => role.position < upper.position && role.position > lower.position)
      .filter(role => {
        if(role.permissions.bitfield & 0x79C0203E) {
          this.client.emit('warn', `Role '${role.name}' in '${guild.name}' has dangerous permissions, omitting from self-role.`);
          return false;
        }
        return true;
      })
      .sort((a,b) => b.position - a.position);

    if(!args) {
      return this.listRoles(roles, msg);
    } else {
      if(msg.guild.me.roles.highest.position < upper.position) return msg.reply(`Missing role high enough to give out roles. I require role \`\`${upper.name}\`\` or higher to be able to hand out roles.`);
      return this.assignRole(roles, msg, args);
    }
  }
};
