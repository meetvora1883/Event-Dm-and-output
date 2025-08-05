const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Configuration using environment variables
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID,
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID,
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || [],
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID
};

// Event names
const EVENT_NAMES = [
  "Family raid", "State Object", "Turf", "Store robbery", "Caravan delivery",
  "Attacking Prison", "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)", "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪", "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓",
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤", "𝔽𝕠𝕦𝕟𝕕𝕣𝕪", "𝕄𝕒𝕝𝕝", "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣",
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕", "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)", "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤", "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖", "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪", "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣", "Family War", "Money Printing Machine",
  "Informal (Battle for business for unofficial organization)"
];

// ... [REST OF YOUR BOT CODE REMAINS UNCHANGED] ...


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
          { name: '📋 Commands', value: '`/attendance` - Record event attendance\n`/help` - Show this message' },
          { name: '📝 Usage', value: '1. Use `/attendance`\n2. Select event\n3. Choose date option\n4. Mention participants' },
          { name: '📁 Channels', value: `• POV Submissions: <#${CONFIG.POV_CHANNEL_ID}>\n• Output: <#${CONFIG.OUTPUT_CHANNEL_ID}>` }
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

// Event selection handler
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

// Date selection handler
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

// Process attendance function
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

    // Send motivational DMs with bold event name
    for (const { user, displayName } of memberInfo) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for being part of the Slayers Family!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true },
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
  console.error(`🛑 Failed to login: ${error}`);
  process.exit(1);
});
