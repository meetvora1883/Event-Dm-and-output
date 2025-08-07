require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000;

// MongoDB Connection
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

// Bonus Schema
const bonusRecordSchema = new mongoose.Schema({
  userId: String,
  username: String,
  eventName: String,
  date: String,
  bonusType: String,
  amount: Number,
  kills: { type: Number, default: 0 },
  parachutes: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const BonusRecord = mongoose.model('BonusRecord', bonusRecordSchema);

// Bonus Configuration
const BONUS_CONFIG = {
  FIXED_BONUS: {
    "Family raid (Attack)": 15000,
    "Family raid (Protection)": 5000,
    "Drug Lab": 8000,
    "State Object": 8000,
    "Store robbery": 15000,
    "Attacking Prison": 10000,
    "RP Ticket Factory": 300000,
    "Vineyard": 20000,
    "Shopping Center": 75000,
    "Bank Robbery": 35000
  },
  PER_KILL_BONUS: {
    "Weapons Factory": 25000,
    "Business War": 80000,
    "Hotel Takeover": 20000,
    "Rating Battle": 20000,
    "Capture of Foundry": 20000,
    "Informal": 50000
  },
  PER_PARACHUTE_BONUS: {
    "Aircraft Carrier": 50000,
    "Harbor Event": 25000
  }
};

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
  EXCLUDED_ROLES: process.env.EXCLUDED_ROLES?.split(',') || ['founder', 'co-founder', 'high command'] // Roles not eligible for bonus
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

// Bonus Helper Functions
async function recordAttendanceBonus(eventName, date, userId, username) {
  let amount = 0;
  
  if (BONUS_CONFIG.FIXED_BONUS[eventName]) {
    amount = BONUS_CONFIG.FIXED_BONUS[eventName];
  }
  
  if (amount > 0) {
    const record = new BonusRecord({
      userId,
      username,
      eventName,
      date,
      bonusType: 'fixed',
      amount
    });
    
    await record.save();
    return amount;
  }
  
  return 0;
}

async function getUserBonusSummary(userId) {
  const records = await BonusRecord.find({ userId });
  
  let total = 0;
  let paid = 0;
  let outstanding = 0;
  
  records.forEach(record => {
    total += record.amount;
    if (record.paid) {
      paid += record.amount;
    } else {
      outstanding += record.amount;
    }
  });
  
  return { total, paid, outstanding };
}

async function addBonus(userId, username, amount, reason) {
  const record = new BonusRecord({
    userId,
    username,
    eventName: reason || 'Manual Adjustment',
    date: formatDate(new Date()),
    bonusType: 'manual',
    amount
  });
  
  await record.save();
  return record;
}

async function reduceBonus(userId, username, amount, reason) {
  const record = new BonusRecord({
    userId,
    username,
    eventName: reason || 'Manual Deduction',
    date: formatDate(new Date()),
    bonusType: 'manual',
    amount: -Math.abs(amount)
  });
  
  await record.save();
  return record;
}

async function markBonusPaid(userId, amount) {
  const records = await BonusRecord.find({ userId, paid: false }).sort({ timestamp: 1 });
  
  let remaining = amount;
  const updatedRecords = [];
  
  for (const record of records) {
    if (remaining <= 0) break;
    
    const toMark = Math.min(record.amount, remaining);
    record.amount -= toMark;
    remaining -= toMark;
    
    if (record.amount <= 0) {
      record.paid = true;
    }
    
    await record.save();
    updatedRecords.push(record);
  }
  
  return updatedRecords;
}

async function getAllBonusRecords() {
  return BonusRecord.aggregate([
    {
      $group: {
        _id: "$userId",
        username: { $first: "$username" },
        totalBonus: { $sum: "$amount" },
        paidBonus: { 
          $sum: { 
            $cond: [{ $eq: ["$paid", true] }, "$amount", 0] 
          } 
        },
        outstandingBonus: { 
          $sum: { 
            $cond: [{ $eq: ["$paid", false] }, "$amount", 0] 
          } 
        }
      }
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        username: 1,
        totalBonus: 1,
        paidBonus: 1,
        outstandingBonus: 1
      }
    },
    { $sort: { outstandingBonus: -1 } }
  ]);
}

async function recordKills(userId, username, eventName, date, kills) {
  const rate = BONUS_CONFIG.PER_KILL_BONUS[eventName];
  if (!rate) throw new Error('This event does not support kill bonuses');
  
  const amount = kills * rate;
  
  const record = new BonusRecord({
    userId,
    username,
    eventName,
    date,
    bonusType: 'kill',
    amount,
    kills
  });
  
  await record.save();
  return record;
}

async function recordParachutes(userId, username, eventName, date, parachutes) {
  const rate = BONUS_CONFIG.PER_PARACHUTE_BONUS[eventName];
  if (!rate) throw new Error('This event does not support parachute bonuses');
  
  const amount = parachutes * rate;
  
  const record = new BonusRecord({
    userId,
    username,
    eventName,
    date,
    bonusType: 'parachute',
    amount,
    parachutes
  });
  
  await record.save();
  return record;
}

function getBonusType(eventName) {
  if (BONUS_CONFIG.FIXED_BONUS[eventName]) return 'fixed';
  if (BONUS_CONFIG.PER_KILL_BONUS[eventName]) return 'kill';
  if (BONUS_CONFIG.PER_PARACHUTE_BONUS[eventName]) return 'parachute';
  return 'none';
}

// Discord events
client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });

  // Register commands
  const commands = [
    {
      name: 'help',
      description: 'Show bot help information'
    },
    {
      name: 'attendance',
      description: 'Record event attendance'
    },
    {
      name: 'addbonus',
      description: 'Add bonus to a member',
      options: [
        {
          name: 'user',
          description: 'The user to add bonus to',
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'amount',
          description: 'Amount to add',
          type: ApplicationCommandOptionType.Integer,
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for bonus',
          type: ApplicationCommandOptionType.String,
          required: false
        }
      ]
    },
    {
      name: 'lessbonus',
      description: 'Reduce bonus for a member',
      options: [
        {
          name: 'user',
          description: 'The user to reduce bonus for',
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'amount',
          description: 'Amount to deduct',
          type: ApplicationCommandOptionType.Integer,
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for deduction',
          type: ApplicationCommandOptionType.String,
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
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'amount',
          description: 'Amount paid',
          type: ApplicationCommandOptionType.Integer,
          required: true
        }
      ]
    },
    {
      name: 'listbonus',
      description: 'List all bonus records'
    },
    {
      name: 'kills',
      description: 'Record kills for bonus calculation',
      options: [
        {
          name: 'user',
          description: 'The user with kills',
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'event',
          description: 'Event name',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'date',
          description: 'Event date (DD/MM/YYYY)',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'count',
          description: 'Number of kills',
          type: ApplicationCommandOptionType.Integer,
          required: true
        }
      ]
    },
    {
      name: 'parachute',
      description: 'Record parachute captures for bonus',
      options: [
        {
          name: 'user',
          description: 'The user with parachute captures',
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'event',
          description: 'Event name',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'date',
          description: 'Event date (DD/MM/YYYY)',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'count',
          description: 'Number of parachute captures',
          type: ApplicationCommandOptionType.Integer,
          required: true
        }
      ]
    },
    {
      name: 'outstanding_bonus_dm',
      description: 'Send DM with your outstanding bonus summary'
    }
  ];

  client.application.commands.set(commands)
    .then(() => console.log('✅ Commands registered'))
    .catch(err => console.error('❌ Command registration failed:', err));
});

// Command handlers
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    // Help command
    if (interaction.commandName === 'help') {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Attendance Bot Help')
        .setDescription('A bot to manage event attendance and bonuses')
        .addFields(
          { name: '📋 Commands', value: '/attendance - Record event attendance\n/help - Show this message\n/outstanding_bonus_dm - Get your bonus summary' },
          { name: '💰 Bonus Commands', value: '/addbonus - Add bonus to member\n/lessbonus - Reduce bonus\n/bonuspaid - Mark bonus as paid\n/listbonus - Show all bonuses\n/kills - Record kills\n/parachute - Record parachutes' }
        );
      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      return;
    }

    // Attendance command
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

    // Outstanding Bonus DM command
    if (interaction.commandName === 'outstanding_bonus_dm') {
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const bonusSummary = await getUserBonusSummary(interaction.user.id);
        
        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('💰 Your Bonus Summary')
          .setDescription('Here are your current bonus details')
          .addFields(
            { name: 'Total Bonus', value: `**$${bonusSummary.total.toLocaleString()}**`, inline: true },
            { name: 'Paid', value: `**$${bonusSummary.paid.toLocaleString()}**`, inline: true },
            { name: 'Outstanding', value: `**$${bonusSummary.outstanding.toLocaleString()}**`, inline: true }
          );
        
        await interaction.user.send({ embeds: [embed] });
        await interaction.editReply('✅ Check your DMs for bonus summary!');
      } catch (error) {
        console.error('Outstanding DM Error:', error);
        await interaction.editReply('❌ Failed to send DM. Please ensure your DMs are open.');
      }
      return;
    }

    // Add bonus command
    if (interaction.commandName === 'addbonus') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Manual bonus';
      
      try {
        const record = await addBonus(user.id, user.username, amount, reason);
        
        await interaction.reply({
          content: `✅ Added **${amount.toLocaleString()}** bonus to ${user.username} for: ${reason}`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Add Bonus Error:', error);
        await interaction.reply({
          content: '❌ Failed to add bonus',
          ephemeral: true
        });
      }
      return;
    }

    // Reduce bonus command
    if (interaction.commandName === 'lessbonus') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Manual deduction';
      
      try {
        const record = await reduceBonus(user.id, user.username, amount, reason);
        
        await interaction.reply({
          content: `✅ Deducted **${amount.toLocaleString()}** from ${user.username} for: ${reason}`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Reduce Bonus Error:', error);
        await interaction.reply({
          content: '❌ Failed to reduce bonus',
          ephemeral: true
        });
      }
      return;
    }

    // Mark bonus paid command
    if (interaction.commandName === 'bonuspaid') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      
      try {
        const records = await markBonusPaid(user.id, amount);
        const bonusSummary = await getUserBonusSummary(user.id);
        
        await interaction.reply({
          content: `✅ Marked **${amount.toLocaleString()}** as paid for ${user.username}\n` +
                   `💰 New Outstanding: **${bonusSummary.outstanding.toLocaleString()}**`,
          ephemeral: true
        });
        
        // Notify user
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('💰 Bonus Payment Received')
          .setDescription(`You've received payment for your bonuses`)
          .addFields(
            { name: 'Amount Paid', value: `**${amount.toLocaleString()}**`, inline: true },
            { name: 'New Outstanding', value: `**${bonusSummary.outstanding.toLocaleString()}**`, inline: true }
          );
        
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.error('Bonus Paid Error:', error);
        await interaction.reply({
          content: '❌ Failed to mark bonus as paid',
          ephemeral: true
        });
      }
      return;
    }

    // List all bonuses
    if (interaction.commandName === 'listbonus') {
      try {
        await interaction.deferReply();
        
        const records = await getAllBonusRecords();
        if (records.length === 0) {
          return interaction.editReply('No bonus records found');
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('💰 Family Bonus Summary')
          .setDescription('Total bonus amounts for all members');
        
        records.forEach(record => {
          embed.addFields({
            name: record.username,
            value: `Total: ${record.totalBonus.toLocaleString()}\n` +
                   `Paid: ${record.paidBonus.toLocaleString()}\n` +
                   `Outstanding: ${record.outstandingBonus.toLocaleString()}`,
            inline: true
          });
        });
        
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('List Bonus Error:', error);
        await interaction.editReply('❌ Failed to retrieve bonus records');
      }
      return;
    }

    // Record kills command
    if (interaction.commandName === 'kills') {
      const user = interaction.options.getUser('user');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');
      const kills = interaction.options.getInteger('count');
      
      try {
        const record = await recordKills(user.id, user.username, eventName, date, kills);
        
        await interaction.reply({
          content: `✅ Recorded **${kills}** kills for ${user.username} at ${eventName} on ${date}\n` +
                   `💰 Bonus Earned: **${record.amount.toLocaleString()}**`,
          ephemeral: true
        });
        
        // Notify user
        const bonusSummary = await getUserBonusSummary(user.id);
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFFFF00)
          .setTitle('🔫 Kill Bonus Recorded')
          .setDescription(`You've earned bonus for kills in an event`)
          .addFields(
            { name: 'Event', value: eventName, inline: true },
            { name: 'Date', value: date, inline: true },
            { name: 'Kills', value: kills.toString(), inline: true },
            { name: 'Bonus Earned', value: `**${record.amount.toLocaleString()}**`, inline: true },
            { name: 'New Total Bonus', value: `**${bonusSummary.total.toLocaleString()}**` }
          );
        
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.error('Kills Error:', error);
        await interaction.reply({
          content: `❌ Failed to record kills: ${error.message}`,
          ephemeral: true
        });
      }
      return;
    }

    // Record parachutes command
    if (interaction.commandName === 'parachute') {
      const user = interaction.options.getUser('user');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');
      const parachutes = interaction.options.getInteger('count');
      
      try {
        const record = await recordParachutes(user.id, user.username, eventName, date, parachutes);
        
        await interaction.reply({
          content: `✅ Recorded **${parachutes}** parachutes for ${user.username} at ${eventName} on ${date}\n` +
                   `💰 Bonus Earned: **${record.amount.toLocaleString()}**`,
          ephemeral: true
        });
        
        // Notify user
        const bonusSummary = await getUserBonusSummary(user.id);
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00FFFF)
          .setTitle('🪂 Parachute Bonus Recorded')
          .setDescription(`You've earned bonus for parachute captures in an event`)
          .addFields(
            { name: 'Event', value: eventName, inline: true },
            { name: 'Date', value: date, inline: true },
            { name: 'Parachutes', value: parachutes.toString(), inline: true },
            { name: 'Bonus Earned', value: `**${record.amount.toLocaleString()}**`, inline: true },
            { name: 'New Total Bonus', value: `**${bonusSummary.total.toLocaleString()}**` }
          );
        
        await user.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.error('Parachute Error:', error);
        await interaction.reply({
          content: `❌ Failed to record parachutes: ${error.message}`,
          ephemeral: true
        });
      }
      return;
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

    // Save to MongoDB and send DMs
    const savePromises = Array.from(users.values()).map(async user => {
      try {
        // Save attendance
        const attendanceRecord = new Attendance({
          eventName,
          date,
          userId: user.id,
          username: user.username
        });
        await attendanceRecord.save();

        // Check if user is eligible for bonus
        const member = await sourceMessage.guild.members.fetch(user.id);
        const isExcluded = member.roles.cache.some(role => 
          CONFIG.EXCLUDED_ROLES.includes(role.name.toLowerCase())
        );

        let bonusAmount = 0;
        if (!isExcluded) {
          bonusAmount = await recordAttendanceBonus(eventName, date, user.id, user.username);
        }

        // Get bonus summary
        const bonusSummary = await getUserBonusSummary(user.id);
        
        // Build DM embed
        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for participating!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true }
          );
        
        // Add bonus info if applicable
        if (bonusAmount > 0) {
          dmEmbed.addFields({
            name: '💰 Bonus Earned',
            value: `**${bonusAmount.toLocaleString()}** for this event`
          });
        } else if (isExcluded) {
          dmEmbed.addFields({
            name: '⚠️ Bonus Eligibility',
            value: 'Your role is not eligible for bonuses'
          });
        }
        
        // Add bonus summary
        dmEmbed.addFields(
          { name: '💰 Total Bonus', value: `**${bonusSummary.total.toLocaleString()}**`, inline: true },
          { name: '✅ Paid', value: `**${bonusSummary.paid.toLocaleString()}**`, inline: true },
          { name: '⏳ Outstanding', value: `**${bonusSummary.outstanding.toLocaleString()}**`, inline: true }
        );
        
        // Add special instructions based on bonus type
        const bonusType = getBonusType(eventName);
        if (bonusType === 'kill') {
          dmEmbed.addFields({
            name: '🔫 Kill Bonus',
            value: `Report your kills using:\n\`/kills @${user.username} "${eventName}" ${date} [count]\``
          });
        }
        else if (bonusType === 'parachute') {
          dmEmbed.addFields({
            name: '🪂 Parachute Bonus',
            value: `Report parachute captures using:\n\`/parachute @${user.username} "${eventName}" ${date} [count]\``
          });
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