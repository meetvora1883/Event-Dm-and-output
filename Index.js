const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

// Initialize Discord Client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Configuration from environment variables
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID,
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID,
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || [],
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID
};

// Event names with fancy formatting
const EVENT_NAMES = [
  "Family raid", "State Object", "Turf", "Store robbery", "Caravan delivery",
  "Attacking Prison", "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)", "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪", "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓",
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤", "𝔽𝕠𝕦𝕟𝕕𝕣𝕪", "𝕄𝕒𝕝𝕝", "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣",
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕", "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)", 
  "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ�𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤", "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖", 
  "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪", "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣", 
  "Family War", "Money Printing Machine",
  "Informal (Battle for business for unofficial organization)"
];

// Date utilities
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
    console.log(`[${new Date().toISOString()}] 🔄 Registering slash commands...`);
    await rest.put(
      Routes.applicationCommands(CONFIG.CLIENT_ID),
      { body: commands }
    );
    console.log(`[${new Date().toISOString()}] ✅ Slash commands registered`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Command registration failed: ${error}`);
  }
}

// Bot ready event
client.on('ready', () => {
  console.log(`\n[${new Date().toISOString()}] 🚀 Bot connected as ${client.user.tag}`);
  console.log(`[${new Date().toISOString()}] 📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`[${new Date().toISOString()}] 📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
  registerCommands();
});

// Permission check
function hasAdminRole(member) {
  return member.roles.cache.some(role => CONFIG.ADMIN_ROLE_IDS.includes(role.id));
}

// Slash command handlers
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    if (interaction.commandName === 'help') {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Attendance Bot Help')
        .setDescription('A bot to manage event attendance and POV submissions')
        .addFields(
          { name: '📋 Commands', value: '/attendance - Record event attendance\n/help - Show this message' },
          { name: '📝 Usage', value: '1. Use /attendance\n2. Select event\n3. Choose date\n4. Mention participants' }
        );
      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      return;
    }

    if (interaction.commandName === 'attendance') {
      if (!hasAdminRole(interaction.member)) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

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
    }
  } catch (error) {
    console.error('Command Error:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Command failed unexpectedly',
        ephemeral: true
      });
    }
  }
});

// Event selection handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'event-select') return;

  try {
    await interaction.deferUpdate();
    const eventName = interaction.values[0];
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
    console.error('Event Select Error:', error);
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
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n📅 Date: **${tomorrow}** (tomorrow)\n\n🔹 Mention participants: (@user1 @user2...)`,
        components: []
      });
      setupMentionCollector(interaction, eventName, tomorrow);
    } else if (dateOption === 'custom') {
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n\n📅 Please enter a custom date (DD/MM/YYYY):`,
        components: []
      });
      setupDateCollector(interaction, eventName);
    }
  } catch (error) {
    console.error('Date Select Error:', error);
  }
});

// Helper function to setup mention collector
function setupMentionCollector(interaction, eventName, date) {
  const mentionFilter = m => m.author.id === interaction.user.id;
  const mentionCollector = interaction.channel.createMessageCollector({
    filter: mentionFilter,
    time: 60000,
    max: 1
  });

  mentionCollector.on('collect', async mentionMessage => {
    try {
      const users = mentionMessage.mentions.users;
      if (users.size === 0) {
        const reply = await mentionMessage.reply({
          content: '❌ Please mention at least one user',
          allowedMentions: { parse: [] }
        });
        setTimeout(() => reply.delete(), 3000);
        return;
      }
      await processAttendance(eventName, date, users, mentionMessage, interaction.channel);
      await mentionMessage.delete().catch(() => {});
    } catch (error) {
      console.error('Mention Collector Error:', error);
    }
  });
}

// Helper function to setup date collector
function setupDateCollector(interaction, eventName) {
  const dateFilter = m => m.author.id === interaction.user.id;
  const dateCollector = interaction.channel.createMessageCollector({
    filter: dateFilter,
    time: 60000,
    max: 1
  });

  dateCollector.on('collect', async dateMessage => {
    try {
      const dateInput = dateMessage.content.trim();
      if (!isValidDate(dateInput)) {
        const reply = await dateMessage.reply({
          content: '❌ Invalid date format. Please use DD/MM/YYYY',
          allowedMentions: { parse: [] }
        });
        setTimeout(() => reply.delete(), 5000);
        await dateMessage.delete().catch(() => {});
        return;
      }

      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n📅 Date: **${dateInput}**\n\n🔹 Mention participants: (@user1 @user2...)`,
        components: []
      });
      setupMentionCollector(interaction, eventName, dateInput);
      await dateMessage.delete().catch(() => {});
    } catch (error) {
      console.error('Date Collector Error:', error);
    }
  });
}

// Process attendance and send DMs
async function processAttendance(eventName, date, users, sourceMessage, commandChannel) {
  try {
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    if (!outputChannel) throw new Error('Output channel not found');

    // Send DMs to participants
    for (const [userId, user] of users) {
      try {
        const member = await sourceMessage.guild.members.fetch(userId);
        const displayName = member.nickname || user.username;

        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for participating!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true },
            { name: '📸 POV Submission', value: `Submit to: <#${CONFIG.POV_CHANNEL_ID}>\n\nFormat:\n\`\`\`\n"${eventName} | @${displayName}"\n"${date}"\n\`\`\`` }
          );

        await user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.error(`Failed to DM ${user.tag}:`, dmError);
      }
    }

    // Send to output channel
    const participantList = Array.from(users.values())
      .map(user => `• <@${user.id}> (${user.username})`)
      .join('\n');

    await outputChannel.send({
      content: `**${eventName} - Attendance**\n**Date:** ${date}\n\n${participantList}`,
      allowedMentions: { users: Array.from(users.keys()) }
    });

    await sourceMessage.reply({
      content: `✅ Attendance recorded for ${users.size} users!\n📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}>`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Attendance Processing Error:', error);
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
