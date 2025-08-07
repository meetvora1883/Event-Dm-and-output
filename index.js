const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// Configuration
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS ? process.env.ADMIN_ROLE_IDS.split(',') : ['1368991091868700773', '1368991334513508532'],
  BOT_PREFIX: process.env.BOT_PREFIX || '!',
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID || null,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  BONUS_LOG_CHANNEL_ID: process.env.BONUS_LOG_CHANNEL_ID || '1398888616532643862' // Channel for bonus logs
};

// Event names
const EVENT_NAMES = [
  "Family raid", "State Object", "Turf", "Store robbery", "Caravan delivery",
  "Attacking Prison", "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)", "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪", "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓",
  "𝔽�𝕔𝕥𝕠𝕣𝕪 �𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖�𝕤", "𝔽𝕠𝕦𝕟𝕕𝕣�", "𝕄𝕒𝕝𝕝", "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣",
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕", "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣�𝕕𝕒𝕪)", "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤", "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖", "𝔸𝕚𝕣𝕔�𝕣𝕒𝕗𝕥 ℂ𝕒�𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕�𝕪)",
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪", "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠�𝕖𝕣", "Family War", "Money Printing Machine",
  "Informal (Battle for business for unofficial organization)"
];

// Bonus tracking system
const bonusData = new Map(); // Format: { userId: { total: number, paid: number, history: [] } }

// Register slash commands
async function registerCommands() {
  const commands = [
    {
      name: 'attendance',
      description: 'Record event attendance',
      options: []
    },
    {
      name: 'help',
      description: 'Show bot help information',
      options: []
    },
    {
      name: 'addbonus',
      description: 'Add bonus to a member',
      options: [
        {
          name: 'user',
          description: 'The user to add bonus to',
          type: 6, // USER type
          required: true
        },
        {
          name: 'amount',
          description: 'Bonus amount to add',
          type: 4, // INTEGER type
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for the bonus',
          type: 3, // STRING type
          required: false
        }
      ]
    },
    {
      name: 'lessbonus',
      description: 'Reduce bonus from a member',
      options: [
        {
          name: 'user',
          description: 'The user to reduce bonus from',
          type: 6, // USER type
          required: true
        },
        {
          name: 'amount',
          description: 'Bonus amount to reduce',
          type: 4, // INTEGER type
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for the reduction',
          type: 3, // STRING type
          required: false
        }
      ]
    },
    {
      name: 'paidbonus',
      description: 'Mark bonus as paid for a member',
      options: [
        {
          name: 'user',
          description: 'The user to mark bonus as paid',
          type: 6, // USER type
          required: true
        },
        {
          name: 'amount',
          description: 'Amount to mark as paid',
          type: 4, // INTEGER type
          required: true
        },
        {
          name: 'note',
          description: 'Payment note',
          type: 3, // STRING type
          required: false
        }
      ]
    },
    {
      name: 'listbonus',
      description: 'List all members bonus summary',
      options: []
    },
    {
      name: 'dmoutstanding',
      description: 'Send DM with outstanding bonus summary to a member',
      options: [
        {
          name: 'user',
          description: 'The user to send DM to',
          type: 6, // USER type
          required: true
        }
      ]
    }
  ];

  const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);

  try {
    console.log(`\x1b[36m[${new Date().toISOString()}] 🔄 Registering slash commands...\x1b[0m`);
    await rest.put(
      Routes.applicationCommands(CONFIG.CLIENT_ID),
      { body: commands }
    );
    console.log(`\x1b[32m[${new Date().toISOString()}] ✅ Slash commands registered successfully\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m[${new Date().toISOString()}] ❌ Failed to register commands: ${error}\x1b[0m`);
  }
}

// Date utility functions
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function isValidDate(dateString) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;
  
  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
}

// Logging function
function logCommand(user, command, status, message = '') {
  const colors = {
    START: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m',  // Green
    FAIL: '\x1b[31m',     // Red
    WARN: '\x1b[33m',     // Yellow
    DEBUG: '\x1b[35m'     // Magenta
  };
  const statusText = {
    START: 'STARTED',
    SUCCESS: 'SUCCESS',
    FAIL: 'FAILED',
    WARN: 'WARNING',
    DEBUG: 'DEBUG'
  };
  
  console.log(
    `[${new Date().toISOString()}] ${colors[status]}${statusText[status]}\x1b[0m ` +
    `| ${user?.tag || 'System'} | ${command} | ${message}`
  );
}

// Bot ready event
client.on('ready', () => {
  console.log(`\n\x1b[32m[${new Date().toISOString()}] 🚀 Bot connected as ${client.user.tag}\x1b[0m`);
  console.log(`[${new Date().toISOString()}] 📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`[${new Date().toISOString()}] 📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  console.log(`[${new Date().toISOString()}] 👑 Admin Roles: ${CONFIG.ADMIN_ROLE_IDS.join(', ')}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
  
  registerCommands();
});

// Utility functions
function hasAdminRole(member) {
  return member.roles.cache.some(role => CONFIG.ADMIN_ROLE_IDS.includes(role.id));
}

function isAllowedChannel(channelId) {
  return !CONFIG.COMMAND_CHANNEL_ID || channelId === CONFIG.COMMAND_CHANNEL_ID;
}

async function getMemberDisplayName(guild, userId) {
  try {
    const member = await guild.members.fetch(userId);
    return member.nickname || member.user.username;
  } catch {
    return null;
  }
}

// Initialize bonus data for a user if not exists
function initUserBonus(userId) {
  if (!bonusData.has(userId)) {
    bonusData.set(userId, {
      total: 0,
      paid: 0,
      history: []
    });
  }
  return bonusData.get(userId);
}

// Log bonus action to the bonus log channel
async function logBonusAction(action, executor, targetUser, amount, note = '') {
  try {
    const logChannel = client.channels.cache.get(CONFIG.BONUS_LOG_CHANNEL_ID);
    if (!logChannel) {
      console.error('Bonus log channel not found');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`💰 Bonus ${action}`)
      .addFields(
        { name: '👤 Executor', value: executor.tag, inline: true },
        { name: '🎯 Target', value: targetUser.tag, inline: true },
        { name: '💵 Amount', value: amount.toString(), inline: true }
      )
      .setTimestamp();

    if (note) {
      embed.addFields({ name: '📝 Note', value: note });
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging bonus action:', error);
  }
}

// Slash command handlers
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    if (interaction.commandName === 'help') {
      logCommand(interaction.user, '/help', 'START');
      
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Attendance Bot Help')
        .setDescription('A bot to manage event attendance and POV submissions')
        .addFields(
          { name: '📋 Attendance Commands', value: '`/attendance` - Record event attendance\n`/help` - Show this message' },
          { name: '💰 Bonus Commands', value: 
            '`/addbonus` - Add bonus to a member\n' +
            '`/lessbonus` - Reduce bonus from a member\n' +
            '`/paidbonus` - Mark bonus as paid\n' +
            '`/listbonus` - List all members bonus summary\n' +
            '`/dmoutstanding` - Send DM with outstanding bonus summary'
          },
          { name: '📝 Usage', value: '1. Use `/attendance`\n2. Select event\n3. Choose date option\n4. Mention participants' },
          { name: '📁 Channels', value: `• POV Submissions: <#${CONFIG.POV_CHANNEL_ID}>\n• Output: <#${CONFIG.OUTPUT_CHANNEL_ID}>\n• Bonus Logs: <#${CONFIG.BONUS_LOG_CHANNEL_ID}>` }
        )
        .setFooter({ text: 'Slayers Family Events' });

      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      logCommand(interaction.user, '/help', 'SUCCESS');
    }

    if (interaction.commandName === 'attendance') {
      logCommand(interaction.user, '/attendance', 'START');

      // Permission check
      if (!hasAdminRole(interaction.member)) {
        logCommand(interaction.user, '/attendance', 'FAIL', 'Insufficient permissions');
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      // Channel check
      if (!isAllowedChannel(interaction.channelId)) {
        logCommand(interaction.user, '/attendance', 'FAIL', 'Wrong channel');
        return interaction.reply({
          content: `❌ Use <#${CONFIG.COMMAND_CHANNEL_ID}> for commands`,
          ephemeral: true
        });
      }

      // Create event selection dropdown
      const eventSelect = new StringSelectMenuBuilder()
        .setCustomId('event-select')
        .setPlaceholder('Choose event')
        .addOptions(EVENT_NAMES.map(event => ({
          label: event.length > 25 ? `${event.substring(0, 22)}...` : event,
          value: event
        })));

      const row = new ActionRowBuilder().addComponents(eventSelect);
      
      await interaction.reply({
        content: '📋 Select an event:',
        components: [row],
        ephemeral: true
      });
      logCommand(interaction.user, '/attendance', 'SUCCESS', 'Event menu displayed');
    }

    // Bonus-related commands
    if (interaction.commandName === 'addbonus') {
      await handleAddBonus(interaction);
    } else if (interaction.commandName === 'lessbonus') {
      await handleLessBonus(interaction);
    } else if (interaction.commandName === 'paidbonus') {
      await handlePaidBonus(interaction);
    } else if (interaction.commandName === 'listbonus') {
      await handleListBonus(interaction);
    } else if (interaction.commandName === 'dmoutstanding') {
      await handleDMOutstanding(interaction);
    }
  } catch (error) {
    logCommand(interaction.user, `/${interaction.commandName}`, 'FAIL', error.message);
    console.error('Error Details:', error.stack);

    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Command failed unexpectedly',
        ephemeral: true
      }).catch(console.error);
    }
  }
});

// Bonus command handlers
async function handleAddBonus(interaction) {
  logCommand(interaction.user, '/addbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/addbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (amount <= 0) {
    logCommand(interaction.user, '/addbonus', 'FAIL', 'Invalid amount');
    return interaction.reply({
      content: '❌ Amount must be greater than 0',
      ephemeral: true
    });
  }

  const userBonus = initUserBonus(user.id);
  userBonus.total += amount;
  userBonus.history.push({
    type: 'add',
    amount,
    reason,
    date: new Date().toISOString(),
    by: interaction.user.id
  });

  // Log the action
  await logBonusAction('added', interaction.user, user, amount, reason);

  // Send DM to the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💰 Bonus Added')
      .setDescription(`You've received a bonus of $${amount}`)
      .addFields(
        { name: '📝 Reason', value: reason },
        { name: '💵 New Total Bonus', value: `$${userBonus.total}`, inline: true },
        { name: '💸 Outstanding', value: `$${userBonus.total - userBonus.paid}`, inline: true }
      )
      .setFooter({ text: 'Slayers Family Bonus System' });

    const dm = await user.createDM();
    await dm.send({ embeds: [dmEmbed] });
    logCommand(interaction.user, '/addbonus', 'DEBUG', `DM sent to ${user.tag}`);
  } catch (error) {
    logCommand(interaction.user, '/addbonus', 'WARN', `Failed DM to ${user.tag}: ${error.message}`);
  }

  await interaction.reply({
    content: `✅ Added $${amount} bonus to ${user.tag}\n📝 Reason: ${reason}`,
    ephemeral: true
  });
  logCommand(interaction.user, '/addbonus', 'SUCCESS', `Added $${amount} to ${user.tag}`);
}

async function handleLessBonus(interaction) {
  logCommand(interaction.user, '/lessbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/lessbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (amount <= 0) {
    logCommand(interaction.user, '/lessbonus', 'FAIL', 'Invalid amount');
    return interaction.reply({
      content: '❌ Amount must be greater than 0',
      ephemeral: true
    });
  }

  const userBonus = initUserBonus(user.id);
  
  if (amount > userBonus.total) {
    logCommand(interaction.user, '/lessbonus', 'FAIL', 'Amount exceeds total bonus');
    return interaction.reply({
      content: `❌ Cannot reduce more than the user's total bonus ($${userBonus.total})`,
      ephemeral: true
    });
  }

  userBonus.total -= amount;
  userBonus.history.push({
    type: 'reduce',
    amount,
    reason,
    date: new Date().toISOString(),
    by: interaction.user.id
  });

  // Log the action
  await logBonusAction('reduced', interaction.user, user, amount, reason);

  // Send DM to the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('💰 Bonus Reduced')
      .setDescription(`$${amount} has been deducted from your bonus`)
      .addFields(
        { name: '📝 Reason', value: reason },
        { name: '💵 New Total Bonus', value: `$${userBonus.total}`, inline: true },
        { name: '💸 Outstanding', value: `$${userBonus.total - userBonus.paid}`, inline: true }
      )
      .setFooter({ text: 'Slayers Family Bonus System' });

    const dm = await user.createDM();
    await dm.send({ embeds: [dmEmbed] });
    logCommand(interaction.user, '/lessbonus', 'DEBUG', `DM sent to ${user.tag}`);
  } catch (error) {
    logCommand(interaction.user, '/lessbonus', 'WARN', `Failed DM to ${user.tag}: ${error.message}`);
  }

  await interaction.reply({
    content: `✅ Reduced $${amount} bonus from ${user.tag}\n📝 Reason: ${reason}`,
    ephemeral: true
  });
  logCommand(interaction.user, '/lessbonus', 'SUCCESS', `Reduced $${amount} from ${user.tag}`);
}

async function handlePaidBonus(interaction) {
  logCommand(interaction.user, '/paidbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/paidbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const note = interaction.options.getString('note') || 'No note provided';

  if (amount <= 0) {
    logCommand(interaction.user, '/paidbonus', 'FAIL', 'Invalid amount');
    return interaction.reply({
      content: '❌ Amount must be greater than 0',
      ephemeral: true
    });
  }

  const userBonus = initUserBonus(user.id);
  const outstanding = userBonus.total - userBonus.paid;

  if (amount > outstanding) {
    logCommand(interaction.user, '/paidbonus', 'FAIL', 'Amount exceeds outstanding');
    return interaction.reply({
      content: `❌ Cannot mark more than the outstanding amount ($${outstanding}) as paid`,
      ephemeral: true
    });
  }

  userBonus.paid += amount;
  userBonus.history.push({
    type: 'paid',
    amount,
    note,
    date: new Date().toISOString(),
    by: interaction.user.id
  });

  // Log the action
  await logBonusAction('paid', interaction.user, user, amount, note);

  // Send DM to the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💰 Bonus Paid')
      .setDescription(`$${amount} of your bonus has been marked as paid`)
      .addFields(
        { name: '📝 Note', value: note },
        { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
        { name: '💳 Total Paid', value: `$${userBonus.paid}`, inline: true },
        { name: '💸 Outstanding', value: `$${userBonus.total - userBonus.paid}`, inline: true }
      )
      .setFooter({ text: 'Slayers Family Bonus System' });

    const dm = await user.createDM();
    await dm.send({ embeds: [dmEmbed] });
    logCommand(interaction.user, '/paidbonus', 'DEBUG', `DM sent to ${user.tag}`);
  } catch (error) {
    logCommand(interaction.user, '/paidbonus', 'WARN', `Failed DM to ${user.tag}: ${error.message}`);
  }

  await interaction.reply({
    content: `✅ Marked $${amount} as paid for ${user.tag}\n📝 Note: ${note}`,
    ephemeral: true
  });
  logCommand(interaction.user, '/paidbonus', 'SUCCESS', `Marked $${amount} as paid for ${user.tag}`);
}

async function handleListBonus(interaction) {
  logCommand(interaction.user, '/listbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/listbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  if (bonusData.size === 0) {
    logCommand(interaction.user, '/listbonus', 'DEBUG', 'No bonus data');
    return interaction.reply({
      content: 'ℹ️ No bonus data available yet',
      ephemeral: true
    });
  }

  // Sort by outstanding amount (descending)
  const sortedEntries = Array.from(bonusData.entries()).sort((a, b) => {
    const aOutstanding = a[1].total - a[1].paid;
    const bOutstanding = b[1].total - b[1].paid;
    return bOutstanding - aOutstanding;
  });

  // Create paginated embeds if there are many users
  const embeds = [];
  let currentEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('💰 Bonus Summary')
    .setDescription('List of all members with their bonus information');

  for (const [userId, data] of sortedEntries) {
    try {
      const member = await interaction.guild.members.fetch(userId);
      const outstanding = data.total - data.paid;
      
      const fieldValue = `Total: $${data.total}\n` +
                        `Paid: $${data.paid}\n` +
                        `Outstanding: $${outstanding}`;
      
      if (currentEmbed.data.fields?.length >= 5) {
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('💰 Bonus Summary (Continued)');
      }
      
      currentEmbed.addFields({
        name: member.displayName || member.user.username,
        value: fieldValue,
        inline: true
      });
    } catch (error) {
      console.error(`Error fetching member ${userId}:`, error);
    }
  }

  if (currentEmbed.data.fields?.length > 0) {
    embeds.push(currentEmbed);
  }

  if (embeds.length === 0) {
    logCommand(interaction.user, '/listbonus', 'DEBUG', 'No valid bonus data');
    return interaction.reply({
      content: 'ℹ️ No valid bonus data to display',
      ephemeral: true
    });
  }

  await interaction.reply({
    content: '📊 Bonus Summary:',
    embeds: [embeds[0]],
    ephemeral: true
  });

  // Send remaining embeds as follow-ups if there are multiple pages
  for (let i = 1; i < embeds.length; i++) {
    await interaction.followUp({
      embeds: [embeds[i]],
      ephemeral: true
    });
  }

  logCommand(interaction.user, '/listbonus', 'SUCCESS', `Displayed ${sortedEntries.length} entries`);
}

async function handleDMOutstanding(interaction) {
  logCommand(interaction.user, '/dmoutstanding', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/dmoutstanding', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const userBonus = initUserBonus(user.id);
  const outstanding = userBonus.total - userBonus.paid;

  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('💰 Your Bonus Summary')
      .setDescription('Here is your current bonus status')
      .addFields(
        { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
        { name: '💳 Total Paid', value: `$${userBonus.paid}`, inline: true },
        { name: '💸 Outstanding', value: `$${outstanding}`, inline: true }
      )
      .setFooter({ text: 'Slayers Family Bonus System' });

    const dm = await user.createDM();
    await dm.send({ embeds: [dmEmbed] });
    logCommand(interaction.user, '/dmoutstanding', 'DEBUG', `DM sent to ${user.tag}`);

    await interaction.reply({
      content: `✅ Sent bonus summary DM to ${user.tag}`,
      ephemeral: true
    });
    logCommand(interaction.user, '/dmoutstanding', 'SUCCESS', `Sent DM to ${user.tag}`);
  } catch (error) {
    logCommand(interaction.user, '/dmoutstanding', 'FAIL', `Failed to send DM: ${error.message}`);
    await interaction.reply({
      content: `❌ Failed to send DM to ${user.tag}. They might have DMs disabled.`,
      ephemeral: true
    });
  }
}

// Event selection handler (existing functionality)
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'event-select') return;

  try {
    await interaction.deferUpdate();
    const eventName = interaction.values[0];
    logCommand(interaction.user, '/attendance [select]', 'SUCCESS', `Selected: ${eventName}`);

    // Create date selection options
    const tomorrow = getTomorrowDate();
    const dateSelect = new StringSelectMenuBuilder()
      .setCustomId('date-select')
      .setPlaceholder('Choose date option')
      .addOptions([
        { label: `Tomorrow (${tomorrow})`, value: 'tomorrow' },
        { label: 'Custom date', value: 'custom' }
      ]);

    const row = new ActionRowBuilder().addComponents(dateSelect);
    
    await interaction.editReply({
      content: `✅ Selected: **${eventName}**\n\n📅 Choose date option:`,
      components: [row]
    });
  } catch (error) {
    logCommand(interaction.user, '/attendance [select]', 'FAIL', error.message);
  }
});

// Date selection handler (existing functionality)
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'date-select') return;

  try {
    await interaction.deferUpdate();
    const dateOption = interaction.values[0];
    const eventName = interaction.message.content.match(/\*\*(.*?)\*\*/)[1];
    
    if (dateOption === 'tomorrow') {
      const tomorrow = getTomorrowDate();
      logCommand(interaction.user, '/attendance [date]', 'SUCCESS', `Selected tomorrow: ${tomorrow}`);
      
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n📅 Date: **${tomorrow}** (tomorrow)\n\n🔹 Mention participants: (@user1 @user2...)`,
        components: []
      });

      // Set up user mention collector
      const mentionFilter = m => m.author.id === interaction.user.id;
      const mentionCollector = interaction.channel.createMessageCollector({ 
        mentionFilter, 
        time: 60000,
        max: 1
      });

      mentionCollector.on('collect', async mentionMessage => {
        try {
          const users = mentionMessage.mentions.users;
          if (users.size === 0) {
            logCommand(interaction.user, '/attendance [mentions]', 'WARN', 'No users mentioned');
            const reply = await mentionMessage.reply({
              content: '❌ Please mention at least one user',
              allowedMentions: { parse: [] }
            });
            setTimeout(() => reply.delete(), 3000);
            return;
          }

          logCommand(interaction.user, '/attendance [mentions]', 'DEBUG', `${users.size} users mentioned`);
          await processAttendance(eventName, tomorrow, users, mentionMessage, interaction.channel);
          await mentionMessage.delete().catch(() => {});
        } catch (error) {
          logCommand(interaction.user, '/attendance [process]', 'FAIL', error.message);
        }
      });
    } else if (dateOption === 'custom') {
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n\n📅 Please enter a custom date (DD/MM/YYYY):`,
        components: []
      });

      // Set up date collector
      const dateFilter = m => m.author.id === interaction.user.id;
      const dateCollector = interaction.channel.createMessageCollector({ 
        dateFilter, 
        time: 60000,
        max: 1
      });

      dateCollector.on('collect', async dateMessage => {
        try {
          const dateInput = dateMessage.content.trim();
          
          // Validate date
          if (!isValidDate(dateInput)) {
            logCommand(interaction.user, '/attendance [date]', 'WARN', 'Invalid date format');
            const reply = await dateMessage.reply({
              content: '❌ Invalid date format. Please use DD/MM/YYYY',
              allowedMentions: { parse: [] }
            });
            setTimeout(() => reply.delete(), 5000);
            await dateMessage.delete().catch(() => {});
            return;
          }

          logCommand(interaction.user, '/attendance [date]', 'SUCCESS', `Custom date: ${dateInput}`);

          // Now ask for user mentions
          await interaction.editReply({
            content: `✅ Event: **${eventName}**\n📅 Date: **${dateInput}**\n\n🔹 Mention participants: (@user1 @user2...)`,
            components: []
          });

          // Set up user mention collector
          const mentionFilter = m => m.author.id === interaction.user.id;
          const mentionCollector = interaction.channel.createMessageCollector({ 
            mentionFilter, 
            time: 60000,
            max: 1
          });

          mentionCollector.on('collect', async mentionMessage => {
            try {
              const users = mentionMessage.mentions.users;
              if (users.size === 0) {
                logCommand(interaction.user, '/attendance [mentions]', 'WARN', 'No users mentioned');
                const reply = await mentionMessage.reply({
                  content: '❌ Please mention at least one user',
                  allowedMentions: { parse: [] }
                });
                setTimeout(() => reply.delete(), 3000);
                return;
              }

              logCommand(interaction.user, '/attendance [mentions]', 'DEBUG', `${users.size} users mentioned`);
              await processAttendance(eventName, dateInput, users, mentionMessage, interaction.channel);
              await mentionMessage.delete().catch(() => {});
            } catch (error) {
              logCommand(interaction.user, '/attendance [process]', 'FAIL', error.message);
            }
          });

          await dateMessage.delete().catch(() => {});
        } catch (error) {
          logCommand(interaction.user, '/attendance [date]', 'FAIL', error.message);
        }
      });
    }
  } catch (error) {
    logCommand(interaction.user, '/attendance [date]', 'FAIL', error.message);
  }
});

// Process attendance function (enhanced with bonus tracking)
async function processAttendance(eventName, date, users, sourceMessage, commandChannel) {
  try {
    // Validate channels
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    
    if (!outputChannel) {
      const errorMsg = 'Output channel not found';
      logCommand(sourceMessage.author, 'processAttendance', 'FAIL', errorMsg);
      await sourceMessage.reply({
        content: '❌ Configuration error: Output channel not found',
        ephemeral: true
      });
      return;
    }

    // Get all member display names
    const memberInfo = await Promise.all(
      Array.from(users.values()).map(async user => {
        const displayName = await getMemberDisplayName(sourceMessage.guild, user.id);
        return { user, displayName: displayName || user.username };
      })
    );

    // Send motivational DMs with bold event name and bonus information
    for (const { user, displayName } of memberInfo) {
      try {
        // Initialize bonus data for the user if not exists
        const userBonus = initUserBonus(user.id);
        
        // Add bonus for attending the event (example: $100 per event)
        const bonusAmount = 0;
        userBonus.total += bonusAmount;
        userBonus.history.push({
          type: 'event',
          amount: bonusAmount,
          reason: `Attended ${eventName}`,
          date: new Date().toISOString(),
          by: sourceMessage.author.id
        });

        const outstanding = userBonus.total - userBonus.paid;

        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for being part of the Slayers Family!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true },
            { 
              name: '💰 Bonus Earned', 
              value: `$${bonusAmount}`,
              inline: true
            },
            { 
              name: '💵 Total Bonus', 
              value: `$${userBonus.total}`,
              inline: true
            },
            { 
              name: '💸 Outstanding', 
              value: `$${outstanding}`,
              inline: true
            },
            { 
              name: '🔥 Motivation', 
              value: 'Your participation makes our family stronger! ' +
                     'We appreciate your dedication and look forward to seeing your POV!'
            },
            { 
              name: '📸 Upload Instructions', 
              value: `Submit your POV to: <#${CONFIG.POV_CHANNEL_ID}>\n\n` +
                     `**Required format:**\n\`\`\`\n"${eventName} | @${displayName}"\n"${date}"\n\`\`\``
            }
          )
          .setFooter({ text: 'Slayers Family Events' });

        const dm = await user.createDM();
        await dm.send({ embeds: [dmEmbed] });
        logCommand(sourceMessage.author, 'processAttendance', 'DEBUG', `DM sent to ${user.tag}`);
      } catch (error) {
        logCommand(sourceMessage.author, 'processAttendance', 'WARN', `Failed DM to ${user.tag}: ${error.message}`);
      }
    }

    // Prepare output message with both mention and profile name
    const outputContent = `**${eventName} - Attendance**\n**Date:** ${date}\n\n` +
      memberInfo.map(({ user, displayName }) => 
        `• <@${user.id}> (${displayName})`
      ).join('\n');

    // Send to output channel
    await outputChannel.send({
      content: outputContent,
      allowedMentions: { users: Array.from(users.keys()) }
    });

    // Send summary to command user
    await sourceMessage.reply({
      content: `✅ Attendance recorded for ${users.size} users!\n` +
               `💰 $${100 * users.size} in bonuses awarded\n` +
               `📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}>`,
      ephemeral: true
    });
    logCommand(sourceMessage.author, 'processAttendance', 'SUCCESS', `Processed ${users.size} users`);

  } catch (error) {
    logCommand(sourceMessage.author, 'processAttendance', 'FAIL', error.message);
    console.error(`[${new Date().toISOString()}] 🛑 Processing Error:`, error.stack);
    await sourceMessage.reply({
      content: '❌ An error occurred while processing attendance',
      ephemeral: true
    });
  }
}

// Start the bot
client.login(CONFIG.DISCORD_TOKEN).catch(error => {
  console.error(`\x1b[31m[${new Date().toISOString()}] 🛑 Failed to login: ${error.message}\x1b[0m`);
  process.exit(1);
});
