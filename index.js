require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes
} = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

console.log('✅ Starting bot initialization...');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Simple interaction queue
const interactionQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || interactionQueue.length === 0) return;
  
  isProcessing = true;
  const interaction = interactionQueue.shift();
  
  try {
    await handleInteraction(interaction);
  } catch (error) {
    console.error('Queue Processing Error:', error);
  } finally {
    isProcessing = false;
    processQueue();
  }
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://meetvora1883:meetvora1883@discordbot.xkgfuaj.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// MongoDB connection events
mongoose.connection.on('connected', () => console.log('✅ MongoDB connection established'));
mongoose.connection.on('error', err => console.error('❌ MongoDB connection error:', err));

// Bonus Schema
const bonusSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  totalBonus: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  outstanding: { type: Number, default: 0 },
  transactions: [{
    amount: Number,
    type: { type: String, enum: ['add', 'deduct', 'paid'], required: true },
    reason: String,
    event: String,
    date: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const Bonus = mongoose.model('Bonus', bonusSchema);

// Event bonus configuration
const EVENT_BONUS_CONFIG = {
  "Family raid (Attack)": { type: "fixed", amount: 15000 },
  "Family raid (Protection)": { type: "fixed", amount: 15000 },
  "State Object": { type: "fixed", amount: 8000 },
  "Turf": { type: "fixed", amount: 0 },
  "Store robbery": { type: "fixed", amount: 0 },
  "Caravan delivery": { type: "fixed", amount: 0 },
  "Attacking Prison": { type: "fixed", amount: 0 },
  "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)": { type: "per_action", action: "parachute", amount: 25000 },
  "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪": { type: "per_kill", amount: 25000 },
  "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: "fixed", amount: 0 },
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤": { type: "fixed", amount: 300000 },
  "𝔽𝕠𝕦𝕟𝕕𝕣𝕪": { type: "per_kill", amount: 20000 },
  "𝕄𝕒𝕝𝕝": { type: "fixed", amount: 75000 },
  "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣": { type: "per_kill", amount: 80000 },
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕": { type: "per_action", action: "harvest", amount: 20000 },
  "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)": { type: "fixed", amount: 0 },
  "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: "fixed", amount: 0 },
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤": { type: "fixed", amount: 0 },
  "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖": { type: "per_kill", amount: 20000 },
  "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: "per_action", action: "parachute", amount: 50000 },
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪": { type: "fixed", amount: 35000 },
  "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣": { type: "per_kill", amount: 20000 },
  "Family War": { type: "fixed", amount: 0 },
  "Money Printing Machine": { type: "fixed", amount: 0 },
  "Informal (Battle for business for unofficial organization)": { type: "per_kill", amount: 50000 }
};

// Ineligible roles
const INELIGIBLE_ROLES = process.env.INELIGIBLE_ROLES?.split(',') || [];

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  eventName: String,
  date: String,
  userId: String,
  username: String,
  timestamp: { type: Date, default: Date.now },
  actionCount: Number
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
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058'
};

// Event names
const EVENT_NAMES = Object.keys(EVENT_BONUS_CONFIG);

// Helper function to update bonus
async function updateBonus(userId, username, amount, type, reason, eventName, date) {
  let bonus = await Bonus.findOne({ userId });
  
  if (!bonus) {
    bonus = new Bonus({ 
      userId, 
      username,
      totalBonus: 0,
      paid: 0,
      outstanding: 0,
      transactions: [] 
    });
  }
  
  let transaction;
  
  switch (type) {
    case 'add':
      bonus.totalBonus += amount;
      bonus.outstanding += amount;
      transaction = { amount, type, reason, event: eventName, date };
      break;
    case 'deduct':
      bonus.totalBonus -= amount;
      bonus.outstanding -= amount;
      transaction = { amount: -amount, type, reason, event: eventName, date };
      break;
    case 'paid':
      if (amount > bonus.outstanding) {
        throw new Error('Amount exceeds outstanding bonus');
      }
      bonus.paid += amount;
      bonus.outstanding -= amount;
      transaction = { amount, type, reason, event: eventName, date };
      break;
    default:
      throw new Error('Invalid transaction type');
  }
  
  bonus.transactions.push(transaction);
  await bonus.save();
  return bonus;
}

// Import commands
const bonusCommands = require('./commands/bonus');
const attendanceCommand = require('./commands/attendance');

// Combine all commands
const allCommands = {
  ...bonusCommands,
  attendance: attendanceCommand
};

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

// Register slash commands
async function registerCommands() {
  const commands = Object.values(allCommands).map(cmd => cmd.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
  
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(CONFIG.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

// Discord events
client.on('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  
  // Register commands
  await registerCommands();
  
  console.log('\n🔄 Initialized Slash Commands:');
  Object.keys(allCommands).forEach(command => console.log(`   ⮕ /${command}`));
  console.log('\n📌 Channel Configurations:');
  console.log(`   POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`   Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  console.log(`👑 Admin Roles: ${CONFIG.ADMIN_ROLE_IDS.join(', ')}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
});

// Interaction handling with queue
client.on('interactionCreate', interaction => {
  interactionQueue.push(interaction);
  processQueue();
});

async function handleInteraction(interaction) {
  try {
    // Command handler
    if (interaction.isCommand()) {
      console.log(`⌨️ Command Received: /${interaction.commandName} by ${interaction.user.tag}`);
      const command = allCommands[interaction.commandName];
      if (command) {
        await command.execute(interaction, {
          Bonus,
          Attendance,
          EVENT_BONUS_CONFIG,
          INELIGIBLE_ROLES,
          CONFIG,
          EVENT_NAMES,
          updateBonus,
          formatDate,
          getTomorrowDate,
          isValidDate
        });
      }
      return;
    }

    // Event selection handler
    if (interaction.isStringSelectMenu() && interaction.customId === 'event-select') {
      console.log(`📋 Event selected: ${interaction.values[0]} by ${interaction.user.tag}`);
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
      return;
    }

    // Date selection handler
    if (interaction.isStringSelectMenu() && interaction.customId === 'date-select') {
      const dateOption = interaction.values[0];
      const eventName = interaction.message.content.match(/\*\*(.*?)\*\*/)[1];
      console.log(`📅 Date option selected: ${dateOption} for ${eventName} by ${interaction.user.tag}`);

      await interaction.deferUpdate();
      
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
      return;
    }

    // Modal submission handler
    if (interaction.isModalSubmit()) {
      const modalId = interaction.customId;
      const eventData = client.eventData?.[modalId];
      
      if (!eventData) {
        console.warn(`⚠️ Modal submit without event data: ${modalId}`);
        await interaction.reply({ 
          content: '❌ Event data not found', 
          ephemeral: true 
        });
        return;
      }
      
      console.log(`📊 Modal submitted for ${eventData.eventName} by ${interaction.user.tag}`);
      
      // Delete stored event data
      delete client.eventData[modalId];
      
      // Process asynchronously after deferring
      await interaction.deferReply({ ephemeral: true });
      await processModalData(interaction, eventData);
    }

    // Button interactions
    if (interaction.isButton()) {
      console.log(`🔘 Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
      await interaction.reply({
        content: 'Button functionality not yet implemented',
        ephemeral: true
      });
    }

  } catch (error) {
    console.error('❌ Interaction Handling Error:', error);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: '❌ An error occurred while processing this interaction',
        ephemeral: true
      }).catch(err => console.error('Failed to send error reply:', err));
    }
  }
}

// Helper function to setup mention collector
function setupMentionCollector(interaction, eventName, date) {
  const mentionFilter = m => m.author.id === interaction.user.id;
  const mentionCollector = interaction.channel.createMessageCollector({
    filter: mentionFilter,
    time: 30000,
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

      // Check if event requires per-action counts
      const bonusConfig = EVENT_BONUS_CONFIG[eventName];
      if (bonusConfig && (bonusConfig.type === 'per_kill' || bonusConfig.type === 'per_action')) {
        // Store user data for later processing
        const eventData = {
          eventName,
          date,
          users: Array.from(users.values()),
          sourceMessage: mentionMessage,
          channel: interaction.channel
        };
        
        // Create modal to collect counts
        const modal = new ModalBuilder()
          .setCustomId(`action-count-modal-${Date.now()}`)
          .setTitle(`Counts for ${eventName}`);
        
        // Add input fields for each user
        users.forEach((user, index) => {
          const actionLabel = bonusConfig.type === 'per_kill' ? 'Kills' : bonusConfig.action;
          const input = new TextInputBuilder()
            .setCustomId(`user-${user.id}`)
            .setLabel(`${user.username} ${actionLabel}`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Enter count for ${user.username}`)
            .setRequired(true);
          
          modal.addComponents(new ActionRowBuilder().addComponents(input));
        });
        
        // Show the modal
        await interaction.showModal(modal);
        
        // Store event data for modal submit handler
        client.eventData = client.eventData || {};
        client.eventData[modal.data.custom_id] = eventData;
      } else {
        // Process directly for fixed bonuses
        await processAttendance(eventName, date, users, mentionMessage, interaction.channel);
      }
      
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
    time: 30000,
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
        content: `✅ Event: ${eventName}\n📅 Date: ${dateInput}\n\n🔹 Mention participants: (@user1 @user2...)`,
        components: []
      });
      setupMentionCollector(interaction, eventName, dateInput);
      await dateMessage.delete().catch(() => {});
    } catch (error) {
      console.error('Date Collector Error:', error);
    }
  });
}

// Process modal data from attendance collection
async function processModalData(interaction, eventData) {
  try {
    const { eventName, date, users, sourceMessage, channel } = eventData;
    const bonusConfig = EVENT_BONUS_CONFIG[eventName];
    const actionLabel = bonusConfig.type === 'per_kill' ? 'kills' : bonusConfig.action;
    
    // Collect counts from modal
    const userCounts = new Map();
    let allValid = true;
    
    for (const user of users) {
      const countValue = interaction.fields.getTextInputValue(`user-${user.id}`);
      const count = parseInt(countValue);
      
      if (isNaN(count) || count < 0) {
        await interaction.followUp({
          content: `❌ Invalid count for ${user.username}: "${countValue}". Must be a positive number.`,
          ephemeral: true
        });
        allValid = false;
        break;
      }
      
      userCounts.set(user.id, count);
    }
    
    if (!allValid) return;
    
    // Process attendance with counts
    const results = [];
    
    for (const user of users) {
      try {
        const count = userCounts.get(user.id) || 0;
        
        // Save attendance record with count
        const attendanceRecord = new Attendance({
          eventName,
          date,
          userId: user.id,
          username: user.username,
          actionCount: count
        });
        await attendanceRecord.save();

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
        }

        // Get member to check roles
        const member = await sourceMessage.guild.members.fetch(user.id);
        const isEligible = !INELIGIBLE_ROLES.some(roleId => member.roles.cache.has(roleId));
        
        // Calculate bonus
        let eventBonus = 0;
        let bonusNote = "No bonus for this event";
        
        if (bonusConfig && isEligible) {
          if (bonusConfig.type === 'per_kill' || bonusConfig.type === 'per_action') {
            eventBonus = count * bonusConfig.amount;
            await updateBonus(
              user.id, 
              user.username, 
              eventBonus, 
              'add', 
              `${count} ${actionLabel} in ${eventName}`,
              eventName,
              date
            );
            bonusNote = `+$${eventBonus} for ${count} ${actionLabel}`;
          } else if (bonusConfig.type === 'fixed') {
            eventBonus = bonusConfig.amount;
            await updateBonus(
              user.id, 
              user.username, 
              eventBonus, 
              'add', 
              `Participation in ${eventName}`,
              eventName,
              date
            );
            bonusNote = `+$${eventBonus} for participation`;
          }
        } else if (!isEligible) {
          bonusNote = "Not eligible for bonus (role)";
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
        results.push({ user, success: true });
      } catch (error) {
        console.error(`Failed to process ${user.tag}:`, error);
        results.push({ user, success: false, error });
      }
    }

    const successful = results.filter(r => r.success).length;

    // Send to output channel
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    if (outputChannel) {
      const participantList = results
        .filter(r => r.success)
        .map(({ user }) => {
          const count = userCounts.get(user.id) || 0;
          return `• <@${user.id}> (${user.username}) - ${count} ${actionLabel}`;
        })
        .join('\n');

      await outputChannel.send({
        content: `**${eventName} - Attendance**\n**Date:** ${date}\n\n${participantList}`,
        allowedMentions: { users: Array.from(users.map(u => u.id)) }
      });
    }

    await interaction.editReply({
      content: `✅ Attendance recorded for ${successful}/${users.length} users!${
        outputChannel ? `\n📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}>` : ''
      }`
    });
  } catch (error) {
    console.error('Modal Processing Error:', error);
    await interaction.editReply({
      content: '❌ An error occurred while processing counts',
    });
  }
}

// Process attendance for fixed bonus events
async function processAttendance(eventName, date, users, sourceMessage, commandChannel) {
  try {
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    if (!outputChannel) throw new Error('Output channel not found');

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
            await updateBonus(
              user.id, 
              user.username, 
              eventBonus, 
              'add', 
              `Participation in ${eventName}`,
              eventName,
              date
            );
            bonusNote = `+$${eventBonus} for participation`;
          } else {
            bonusNote = `Bonus will be calculated later (${bonusConfig.type})`;
          }
        } else if (!isEligible) {
          bonusNote = "Not eligible for bonus (role)";
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

console.log('✅ All systems initialized - bot starting...');
