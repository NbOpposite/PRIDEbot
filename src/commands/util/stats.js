const RestrictedCommand = require('../../restrictedCommand');

const SPACER = Symbol('spacer');

const guilds = {
  gru: '456590512842080268',
  dru: '389948828872343552',
  eru: '399619671281762304',
  pv: '402947178051665922',
  ta: '402269468178251777',
  mod: '407894440208760832',
  bru: '448171713444708362'
};

function formatOutput(output) {
  const sizes = [0,0];
  let str = '';
  for(const row of output) {
    if(row === SPACER) continue;
    sizes[0] = Math.max(String(row[0]).length, sizes[0]);
    sizes[1] = Math.max(String(row[1]).length, sizes[1]);
  }
  str += `┏${'━'.repeat(sizes[0])}━┯━${'━'.repeat(sizes[1])}┓\n`;
  for(const row of output) {
    if(row !== SPACER) {
      const key = String(row[0]);
      const val = String(row[1]);
      str += `┃${key.padEnd(sizes[0])} │ ${val.padStart(sizes[1])}┃\n`;
    } else {
      str += `┠${'─'.repeat(sizes[0])}─┼─${'─'.repeat(sizes[1])}┨\n`;
    }
  }
  str += `┗${'━'.repeat(sizes[0])}━┷━${'━'.repeat(sizes[1])}┛\n`;
  return str;
}

module.exports = class StatsCommand extends RestrictedCommand {
  constructor(client) {
    super(client, {
      name: 'stats',
      aliases: [],
      group: 'util',
      memberName: 'stats',
      description: 'Gets stats from a server. Specified server can only be used by PRIDEverse moderators',
      examples: ['stats', 'stats dru'],
      clientPermissions: [],
      format: '[server]',
      permGroup: 'Member',
    });
  }
  async run(msg, args) {
    let guild;
    if(args === '') {
      guild = msg.guild;
    } else if(msg.guild.id === guilds.mod) {
      guild = this.client.guilds.get(guilds[args.toLowerCase()]);
    } else {
      if(msg.guild && msg.guild.id === guilds[args.toLowerCase()]) {
        guild = msg.guild;
      } else {
        return msg.reply('Showing statistics for servers outside the current one is only acceptable from the moderator server');
      }
    }
    if(!guild) {
      return msg.reply(`Could not find server ${args}`);
    }

    const [members, bots] = (await guild.members.fetch()).partition(e=>!e.user.bot);
    const roles = guild.roles.filter(e=>e.id!==guild.id).reduce((acc,role)=>(acc[role.id]={name: role.name, count: 0},acc), {none: {name:'<NO_ROLES>', count: 0}});
    for(const [,member] of members) {
      if(member.roles.size === 1) {
        roles.none.count++;
      } else {
        for(const [,role] of member.roles.filter(e=>e.id!==guild.id)) {
          roles[role.id].count++;
        }
      }
    }

    const output = [
      ['Members', members.size],
      ['Bots', bots.size],
      SPACER
    ];
    for (const role of [...Object.values(roles)].filter(e=>e.count>0).sort((a,b)=>b.count-a.count)) {
      output.push([role.name, role.count]);
    }
    const outputStr = formatOutput(output);
    return msg.reply(`\`\`\`\n${outputStr}\n\`\`\``);
  }
};
