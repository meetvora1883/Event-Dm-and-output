require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const { initBonusCommands } = require('./bonus');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000;

// MongoDB Connection (modern syntax)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://meetvora1883:meetvora1883@discordbot.xkgfuaj.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  eventName: String,
  date: String,
  userId: String,
  username: String,
  timestamp: { type: Date, default: Date.now }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Configuration
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || ['1398888612388540538', '1398888612388540537'],
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID || '1398888617312518188',
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058',
  EXCLUDED_BONUS_ROLES: process.env.EXCLUDED_BONUS_ROLES?.split(',') || ['1398888612388540538', '1398888612388540537', '1398888612388540539']
};

// Event names
const EVENT_NAMES = [
  "Family raid (Attack)", "Family raid (Protection)", "State Object", "Turf", "Store robbery", "Caravan delivery",
  "Attacking Prison", "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)", "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪", "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓",
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤", "𝔽𝕠𝕦𝕟𝕕𝕣𝕪", "𝕄𝕒𝕝𝕝", "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣",
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕", "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)", 
  "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤", "ℝ�𝕥𝕚𝕟𝕘 𝔹�𝕥𝕥𝕝𝕖", 
  "𝔸�𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪", "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣", 
  "Family War", "Money Printing Machine",
  "Informal (Battle for business for unofficial organization)"
];

// Initialize bonus commands
initBonusCommands(client);

// Express Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// API endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    bot: client.readyAt ? 'connected' : 'connecting',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🖥️ Server running on port ${PORT}`);
});

// Keepalive ping with axios
setInterval(async () => {
  try {
    await axios.get(`http://localhost:${PORT}/api/status`);
    console.log('♻️ Keepalive ping successful');
  } catch (err) {
    console.warn('⚠️ Keepalive ping failed:', err.message);
  }
}, 300000);

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

// Check if user is eligible for bonus
function isEligibleForBonus(member) {
  return !CONFIG.EXCLUDED_BONUS_ROLES.some(roleId => member.roles.cache.has(roleId));
}

// Discord events
client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });

  // Register slash commands
  registerCommands().catch(console.error);
});

// Register slash commands
async function registerCommands() {
  try {
    const commands = [
      {
        name: 'attendance',
        description: 'Record event attendance'
      },
      {
        name: 'help',
        description: 'Show help information'
      },
      {
        name: 'addbonus',
        description: 'Add bonus to a user',
        options: [
          {
            name: 'user',
            description: 'The user to add bonus to',
            type: 6, // USER
            required: true
          },
          {
            name: 'amount',
            description: 'Amount to add',
            type: 4, // INTEGER
            required: true
          },
          {
            name: 'description',
            description: 'Description of the bonus',
            type: 3, // STRING
            required: false
          }
        ]
      },
      {
        name: 'lessbonus',
        description: 'Deduct bonus from a user',
        options: [
          {
            name: 'user',
            description: 'The user to deduct bonus from',
            type: 6, // USER
            required: true
          },
          {
            name: 'amount',
            description: 'Amount to deduct',
            type: 4, // INTEGER
            required: true
          },
          {
            name: 'description',
            description: 'Description of the deduction',
            type: 3, // STRING
            required: false
          }
        ]
      },
      {
        name: 'bonuspaid',
        description: 'Mark bonus as paid',
        options: [
          {
            name: 'user',
            description: 'The user who received payment',
            type: 6, // USER
            required: true
          },
          {
            name: 'amount',
            description: 'Amount paid',
            type: 4, // INTEGER
            required: true
          }
        ]
      },
      {
        name: 'listbonus',
        description: 'List all bonus records'
      },
      {
        name: 'outstanding_bonus_dm',
        description: 'Send DMs with outstanding bonus info'
      },
      {
        name: 'kills',
        description: 'Record kills for kill-based bonuses',
        options: [
          {
            name: 'users',
            description: 'Users who got kills',
            type: 6, // USER
            required: true
          },
          {
            name: 'event',
            description: 'The event name',
            type: 3, // STRING
            required: true,
            choices: [
              { name: "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪", value: "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪" },
              { name: "𝔽𝕠𝕦𝕟𝕕𝕣𝕪", value: "𝔽𝕠𝕦𝕟𝕕𝕣𝕪" },
              { name: "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣", value: "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣" },
              { name: "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖", value: "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖" },
              { name: "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣", value: "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣" },
              { name: "Informal (Battle for business for unofficial organization)", value: "Informal (Battle for business for unofficial organization)" }
            ]
          },
          {
            name: 'date',
            description: 'Date of the event (DD/MM/YYYY)',
            type: 3, // STRING
            required: false
          },
          {
            name: 'count',
            description: 'Number of kills',
            type: 4, // INTEGER
            required: false
          }
        ]
      },
      {
        name: 'parachute',
        description: 'Record parachute takes for parachute-based bonuses',
        options: [
          {
            name: 'users',
            description: 'Users who took parachute',
            type: 6, // USER
            required: true
          },
          {
            name: 'event',
            description: 'The event name',
            type: 3, // STRING
            required: true,
            choices: [
              { name: "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)", value: "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)" },
              { name: "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)", value: "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)" }
            ]
          },
          {
            name: 'date',
            description: 'Date of the event (DD/MM/YYYY)',
            type: 3, // STRING
            required: false
          },
          {
            name: 'count',
            description: 'Number of parachute takes',
            type: 4, // INTEGER
            required: false
          }
        ]
      },
      {
        name: 'bonushelp',
        description: 'Show help for bonus commands'
      }
    ];

    await client.application.commands.set(commands);
    console.log('✅ Successfully registered all commands');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

// Command handlers
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
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
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

// Helper functions
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

async function processAttendance(eventName, date, users, sourceMessage, commandChannel) {
  try {
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    if (!outputChannel) throw new Error('Output channel not found');

    // Event bonus configuration
    const EVENT_BONUSES = {
      "Family raid (Attack)": { type: 'custom', amount: 15000 },
      "Family raid (Protection)": { type: 'custom', amount: 5000 },
      "State Object": { type: 'custom', amount: 8000 },
      "Store robbery": { type: 'custom', amount: 15000 },
      "Attacking Prison": { type: 'custom', amount: 10000 },
      "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)": { type: 'parachute', amount: 25000 },
      "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪": { type: 'kill', amount: 25000 },
      "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: 'custom', amount: 8000 },
      "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤": { type: 'custom', amount: 300000 },
      "𝔽𝕠𝕦𝕟𝕕𝕣𝕪": { type: 'kill', amount: 20000 },
      "𝕄𝕒𝕝𝕝": { type: 'custom', amount: 75000 },
      "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣": { type: 'kill', amount: 80000 },
      "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕": { type: 'custom', amount: 20000 },
      "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)": { type: 'custom', amount: 10000 },
      "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖": { type: 'kill', amount: 20000 },
      "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'parachute', amount: 50000 },
      "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪": { type: 'custom', amount: 35000 },
      "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣": { type: 'kill', amount: 20000 },
      "Informal (Battle for business for unofficial organization)": { type: 'kill', amount: 50000 }
    };

    const bonusInfo = EVENT_BONUSES[eventName];
    const bonusAmount = bonusInfo ? (bonusInfo.type === 'custom' ? bonusInfo.amount : `$${bonusInfo.amount} per ${bonusInfo.type}`) : 'No bonus';

    // Save to MongoDB and send DMs
    const savePromises = Array.from(users.values()).map(async user => {
      try {
        // Save attendance to MongoDB
        const attendanceRecord = new Attendance({
          eventName,
          date,
          userId: user.id,
          username: user.username
        });
        await attendanceRecord.save();

        // Send DM
        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for participating!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true },
            { name: '💰 Bonus', value: bonusAmount, inline: true },
            { name: '📸 POV Submission', value: `Submit to: <#${CONFIG.POV_CHANNEL_ID}>\n\nFormat:\n\`\`\`\n"${eventName} | @${user.username}"\n"${date}"\n\`\`\`` }
          );

        // If user is eligible for bonus and there is a bonus for this event
        const member = sourceMessage.guild.members.cache.get(user.id);
        if (member && isEligibleForBonus(member) && bonusInfo) {
          const { calculateBonus } = require('./bonus/bonus');
          const bonusRecord = await calculateBonus(user.id, user.username, eventName, date, bonusInfo.type);
          if (bonusRecord) {
            dmEmbed.addFields(
              { name: 'Your Total Bonus', value: `$${bonusRecord.totalBonus}`, inline: true },
              { name: 'Paid', value: `$${bonusRecord.paidBonus}`, inline: true },
              { name: 'Outstanding', value: `$${bonusRecord.outstandingBonus}`, inline: true }
            );
          }
        }

        await user.send({ embeds: [dmEmbed] });
        return { user, success: true };
      } catch (error) {
        console.error(`Failed to process ${user.tag}:`, error);
        return { user, success: false, error };
      }
    });

    const results = await Promise.all(savePromises);
    const successful = results.filter(r => r.success).length;

    // Send to output channel
    const participantList = results
      .filter(r => r.success)
      .map(({ user }) => `• <@${user.id}> (${user.username})`)
      .join('\n');

    await outputChannel.send({
      content: `**${eventName} - Attendance**\n**Date:** ${date}\n\n${participantList}`,
      allowedMentions: { users: Array.from(users.keys()) }
    });

    await sourceMessage.reply({
      content: `✅ Attendance recorded for ${successful}/${users.size} users!\n📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}>`,
      ephemeral: true
    });

    console.log(`Processed attendance for ${successful} users for event ${eventName}`);
  } catch (error) {
    console.error('Attendance Processing Error:', error);
    await sourceMessage.reply({
      content: '❌ An error occurred while processing attendance',
      ephemeral: true
    });
  }
}

// Error handling
process.on('unhandledRejection', error => {
  console.error('⚠️ Unhandled rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('⚠️ Uncaught exception:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  client.destroy();
  mongoose.disconnect();
  process.exit(0);
});

// Start bot
client.login(CONFIG.DISCORD_TOKEN).catch(error => {
  console.error('❌ Failed to login:', error);
  process.exit(1);
});
