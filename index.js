require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

console.log('✅ Starting bot initialization...');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://meetvora1883:meetvora1883@discordbot.xkgfuaj.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import bonus system
const { 
  addbonusCommand,
  lessbonusCommand,
  bonuspaidCommand,
  listbonusCommand,
  bonushelpCommand,
  EVENT_BONUS_CONFIG,
  INELIGIBLE_ROLES,
  updateBonus
} = require('./bonus');

console.log('✅ Bonus system imported successfully');

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
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058'
};

// Event names
const EVENT_NAMES = [
  "Family raid (Attack)", "Family raid (Protection)", "State Object", "Turf", "Store robbery", "Caravan delivery",
  "Attacking Prison", "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)", "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪", "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓",
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤", "𝔽𝕠𝕦𝕟𝕕𝕣𝕪", "𝕄𝕒𝕝𝕝", "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣",
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕", "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)", 
  "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤", "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖", 
  "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪", "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣", 
  "Family War", "Money Printing Machine",
  "Informal (Battle for business for unofficial organization)"
];

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  eventName: String,
  date: String,
  userId: String,
  username: String,
  timestamp: { type: Date, default: Date.now }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
console.log('✅ Database models initialized');

// Register bonus commands
const bonusCommands = [
  addbonusCommand,
  lessbonusCommand,
  bonuspaidCommand,
  listbonusCommand,
  bonushelpCommand
];

console.log(`✅ Registered ${bonusCommands.length} bonus commands`);

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
    uptime: process.uptime(),
    bonusSystem: 'active'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🖥️ Server running on port ${PORT}`);
});

// Keepalive ping
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

// Discord events
client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  console.log(`👑 Admin Roles: ${CONFIG.ADMIN_ROLE_IDS.join(', ')}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
});

// Command handlers
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    // Handle bonus commands first
    for (const command of bonusCommands) {
      if (interaction.commandName === command.data.name) {
        console.log(`⚡ Handling bonus command: ${interaction.commandName}`);
        await command.execute(interaction);
        return;
      }
    }

    // Original commands
    if (interaction.commandName === 'help') {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Attendance Bot Help')
        .setDescription('A bot to manage event attendance and POV submissions')
        .addFields(
          { name: '📋 Commands', value: '/attendance - Record event attendance\n/help - Show this message\n/bonushelp - Show bonus commands' },
          { name: '📝 Usage', value: '1. Use /attendance\n2. Select event\n3. Choose date\n4. Mention participants' }
        );
      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      return;
    }

    if (interaction.commandName === 'attendance') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        console.log('⛔ User lacks permissions for attendance command');
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
    console.error('❌ Command Error:', error);
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
    console.log(`📅 User selected event: ${eventName}`);
  } catch (error) {
    console.error('❌ Event Select Error:', error);
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
      console.log(`📅 User selected tomorrow's date for ${eventName}`);
      setupMentionCollector(interaction, eventName, tomorrow);
    } else if (dateOption === 'custom') {
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n\n📅 Please enter a custom date (DD/MM/YYYY):`,
        components: []
      });
      console.log(`📅 User requested custom date for ${eventName}`);
      setupDateCollector(interaction, eventName);
    }
  } catch (error) {
    console.error('❌ Date Select Error:', error);
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

      console.log(`👥 Processing ${users.size} mentioned users for ${eventName}`);
      await processAttendance(eventName, date, users, mentionMessage, interaction.channel);
      await mentionMessage.delete().catch(() => {});
    } catch (error) {
      console.error('❌ Mention Collector Error:', error);
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
      console.log(`📅 User entered valid date: ${dateInput}`);
      setupMentionCollector(interaction, eventName, dateInput);
      await dateMessage.delete().catch(() => {});
    } catch (error) {
      console.error('❌ Date Collector Error:', error);
    }
  });
}

async function processAttendance(eventName, date, users, sourceMessage, commandChannel) {
  try {
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    if (!outputChannel) throw new Error('Output channel not found');

    console.log(`📝 Processing attendance for ${users.size} users for event: ${eventName}`);
    
    // Save to MongoDB and send DMs
    const savePromises = Array.from(users.values()).map(async user => {
      try {
        // Save attendance record
        const attendanceRecord = new Attendance({
          eventName,
          date,
          userId: user.id,
          username: user.username
        });
        await attendanceRecord.save();
        console.log(`📝 Saved attendance for ${user.username}`);

        // Get bonus summary for DM
        let bonusRecord = await Bonus.findOne({ userId: user.id });
        if (!bonusRecord) {
          bonusRecord = new Bonus({
            userId: user.id,
            username: user.username,
            totalBonus: 0,
            paid: 0,
            outstanding: 0,
            transactions: []
          });
          console.log(`➕ Created new bonus record for ${user.username}`);
        }

        // Get member to check roles
        const member = await sourceMessage.guild.members.fetch(user.id);
        const isEligible = !INELIGIBLE_ROLES.some(roleId => member.roles.cache.has(roleId));
        
        // Check if event has bonus
        const bonusConfig = EVENT_BONUS_CONFIG[eventName];
        let eventBonus = 0;
        let bonusNote = "No bonus for this event";
        
        if (bonusConfig && isEligible) {
          if (bonusConfig.type === 'fixed') {
            eventBonus = bonusConfig.amount;
            await updateBonus(user.id, user.username, eventBonus, 'add', `Event: ${eventName}`);
            bonusNote = `+$${eventBonus} for participation`;
            console.log(`💰 Added $${eventBonus} bonus to ${user.username} for ${eventName}`);
          } else {
            bonusNote = `Bonus will be calculated later (${bonusConfig.type})`;
            console.log(`ℹ️ Deferred bonus calculation for ${user.username} (${bonusConfig.type})`);
          }
        } else if (!isEligible) {
          bonusNote = "Not eligible for bonus (role)";
          console.log(`ℹ️ ${user.username} not eligible for bonus due to role`);
        }

        // Send DM with bonus info
        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for participating!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true },
            { name: '💰 Bonus', value: bonusNote, inline: false },
            { name: '📊 Bonus Summary', value: `Total: $${bonusRecord.totalBonus + eventBonus}\nPaid: $${bonusRecord.paid}\nOutstanding: $${bonusRecord.outstanding + eventBonus}`, inline: false },
            { name: '📸 POV Submission', value: `Submit to: <#${CONFIG.POV_CHANNEL_ID}>\n\nFormat:\n\`\`\`\n"${eventName} | @${user.username}"\n"${date}"\n\`\`\`` }
          );

        await user.send({ embeds: [dmEmbed] });
        console.log(`📩 Sent DM to ${user.username}`);
        return { user, success: true };
      } catch (error) {
        console.error(`❌ Failed to process ${user.tag}:`, error);
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

    console.log(`✅ Processed attendance for ${successful} users for event ${eventName}`);
  } catch (error) {
    console.error('❌ Attendance Processing Error:', error);
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

console.log('✅ All systems initialized - bot starting...');
