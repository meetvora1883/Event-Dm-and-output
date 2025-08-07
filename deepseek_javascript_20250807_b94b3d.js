require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ApplicationCommandOptionType
} = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Enhanced logging system
const logger = {
  info: (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO:`, ...args);
  },
  error: (...args) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR:`, ...args);
    // Here you could add error reporting to external services
  },
  warn: (...args) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN:`, ...args);
  },
  debug: (...args) => {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] DEBUG:`, ...args);
    }
  }
};

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://meetvora1883:meetvora1883@discordbot.xkgfuaj.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => logger.info('✅ Connected to MongoDB'))
  .catch(err => logger.error('❌ MongoDB connection error:', err));

// Schemas
const attendanceSchema = new mongoose.Schema({
  eventName: String,
  date: String,
  userId: String,
  username: String,
  timestamp: { type: Date, default: Date.now }
});

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

const Attendance = mongoose.model('Attendance', attendanceSchema);
const BonusRecord = mongoose.model('BonusRecord', bonusRecordSchema);

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'] // Add partials to prevent missing data errors
});

// Configuration
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || ['1398888612388540538', '1398888612388540537'],
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID || '1398888617312518188',
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058',
  EXCLUDED_ROLES: process.env.EXCLUDED_ROLES?.split(',') || ['founder', 'co-founder', 'high command']
};

// Event names
const EVENT_NAMES = [
  "Family raid (Attack)", "Family raid (Protection)", "State Object", "Turf", "Store robbery", "Caravan delivery",
  "Attacking Prison", "Harbor (battle for the docks)", "Weapons Factory", "Drug Lab",
  "RP Ticket Factory", "Foundry", "Mall", "Business War",
  "Vineyard", "Attacking Prison (on Friday)", 
  "King of Cayo Perico Island", "Leftover Components", "Rating Battle", 
  "Aircraft Carrier", "Bank Robbery", "Hotel Takeover", 
  "Family War", "Money Printing Machine", "Informal"
];

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

// Express setup
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
  logger.info(`🖥️ Server running on port ${PORT}`);
});

// Keepalive ping
setInterval(async () => {
  try {
    await axios.get(`http://localhost:${PORT}/api/status`);
    logger.debug('♻️ Keepalive ping successful');
  } catch (err) {
    logger.warn('⚠️ Keepalive ping failed:', err.message);
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
  try {
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
      logger.debug(`Recorded bonus for ${username} (${userId}) for ${eventName} on ${date}`);
      return amount;
    }
    
    return 0;
  } catch (error) {
    logger.error(`Error recording attendance bonus for ${userId}:`, error);
    return 0;
  }
}

async function getUserBonusSummary(userId) {
  try {
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
  } catch (error) {
    logger.error(`Error getting bonus summary for ${userId}:`, error);
    return { total: 0, paid: 0, outstanding: 0 };
  }
}

async function addBonus(userId, username, amount, reason) {
  try {
    const record = new BonusRecord({
      userId,
      username,
      eventName: reason || 'Manual Adjustment',
      date: formatDate(new Date()),
      bonusType: 'manual',
      amount
    });
    
    await record.save();
    logger.info(`Added bonus of ${amount} to ${username} (${userId}) for: ${reason}`);
    return record;
  } catch (error) {
    logger.error(`Error adding bonus for ${userId}:`, error);
    throw error;
  }
}

async function reduceBonus(userId, username, amount, reason) {
  try {
    const record = new BonusRecord({
      userId,
      username,
      eventName: reason || 'Manual Deduction',
      date: formatDate(new Date()),
      bonusType: 'manual',
      amount: -Math.abs(amount)
    });
    
    await record.save();
    logger.info(`Reduced bonus by ${amount} from ${username} (${userId}) for: ${reason}`);
    return record;
  } catch (error) {
    logger.error(`Error reducing bonus for ${userId}:`, error);
    throw error;
  }
}

async function markBonusPaid(userId, amount) {
  try {
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
    
    logger.info(`Marked ${amount} as paid for user ${userId}`);
    return updatedRecords;
  } catch (error) {
    logger.error(`Error marking bonus as paid for ${userId}:`, error);
    throw error;
  }
}

async function getAllBonusRecords() {
  try {
    return await BonusRecord.aggregate([
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
  } catch (error) {
    logger.error('Error getting all bonus records:', error);
    return [];
  }
}

async function recordKills(userId, username, eventName, date, kills) {
  try {
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
    logger.info(`Recorded ${kills} kills for ${username} (${userId}) at ${eventName} on ${date}`);
    return record;
  } catch (error) {
    logger.error(`Error recording kills for ${userId}:`, error);
    throw error;
  }
}

async function recordParachutes(userId, username, eventName, date, parachutes) {
  try {
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
    logger.info(`Recorded ${parachutes} parachutes for ${username} (${userId}) at ${eventName} on ${date}`);
    return record;
  } catch (error) {
    logger.error(`Error recording parachutes for ${userId}:`, error);
    throw error;
  }
}

function getBonusType(eventName) {
  if (BONUS_CONFIG.FIXED_BONUS[eventName]) return 'fixed';
  if (BONUS_CONFIG.PER_KILL_BONUS[eventName]) return 'kill';
  if (BONUS_CONFIG.PER_PARACHUTE_BONUS[eventName]) return 'parachute';
  return 'none';
}

// Discord events
client.on('ready', () => {
  logger.info(`🤖 Logged in as ${client.user.tag}`);
  logger.info(`📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  logger.info(`📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
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
    .then(() => logger.info('✅ Commands registered'))
    .catch(err => logger.error('❌ Command registration failed:', err));
});

// Main interaction handler with improved error handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    // Check if interaction is already handled
    if (interaction.replied || interaction.deferred) {
      logger.warn(`Interaction ${interaction.id} already handled`);
      return;
    }

    // Log the incoming interaction
    logger.debug(`Handling interaction: ${interaction.commandName} from ${interaction.user.tag}`);

    switch (interaction.commandName) {
      case 'help':
        await handleHelpCommand(interaction);
        break;
      case 'attendance':
        await handleAttendanceCommand(interaction);
        break;
      case 'outstanding_bonus_dm':
        await handleOutstandingBonusDM(interaction);
        break;
      case 'addbonus':
        await handleAddBonus(interaction);
        break;
      case 'lessbonus':
        await handleLessBonus(interaction);
        break;
      case 'bonuspaid':
        await handleBonusPaid(interaction);
        break;
      case 'listbonus':
        await handleListBonus(interaction);
        break;
      case 'kills':
        await handleKills(interaction);
        break;
      case 'parachute':
        await handleParachute(interaction);
        break;
      default:
        logger.warn(`Unknown command: ${interaction.commandName}`);
        await interaction.reply({ 
          content: '❌ Unknown command', 
          ephemeral: true 
        });
    }
  } catch (error) {
    logger.error(`Error handling interaction ${interaction.id}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ 
          content: '❌ An error occurred while processing this command', 
          ephemeral: true 
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    } else if (interaction.deferred) {
      try {
        await interaction.editReply({ 
          content: '❌ An error occurred while processing this command'
        });
      } catch (editError) {
        logger.error('Failed to edit error reply:', editError);
      }
    }
  }
});

// Command handlers
async function handleHelpCommand(interaction) {
  try {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🆘 Slayers Family Bot Help')
      .setDescription('Commands for attendance and bonus tracking')
      .addFields(
        { name: '📋 Attendance', value: '/attendance - Record event attendance' },
        { name: '💰 Bonus', value: '/addbonus - Add bonus\n/lessbonus - Reduce bonus\n/bonuspaid - Mark as paid\n/listbonus - Show all bonuses\n/outstanding_bonus_dm - Get your summary' },
        { name: '🎯 Events', value: '/kills - Record kills\n/parachute - Record parachutes' }
      );
    
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    logger.debug(`Sent help command response to ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error in handleHelpCommand:', error);
    throw error;
  }
}

async function handleAttendanceCommand(interaction) {
  try {
    // Check permissions
    if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      logger.warn(`Unauthorized access attempt by ${interaction.user.tag}`);
      return await interaction.reply({ 
        content: '⛔ You lack permissions for this command', 
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
    logger.debug(`Started attendance process for ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error in handleAttendanceCommand:', error);
    throw error;
  }
}

async function handleOutstandingBonusDM(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const bonusSummary = await getUserBonusSummary(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('💰 Your Bonus Summary')
      .addFields(
        { name: 'Total Bonus', value: `$${bonusSummary.total.toLocaleString()}`, inline: true },
        { name: 'Paid', value: `$${bonusSummary.paid.toLocaleString()}`, inline: true },
        { name: 'Outstanding', value: `$${bonusSummary.outstanding.toLocaleString()}`, inline: true }
      );
    
    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply({ content: '✅ Check your DMs for bonus summary!' });
      logger.info(`Sent bonus summary DM to ${interaction.user.tag}`);
    } catch (dmError) {
      logger.warn(`Failed to send DM to ${interaction.user.tag}:`, dmError);
      await interaction.editReply({ content: '❌ Failed to send DM. Please enable DMs!' });
    }
  } catch (error) {
    logger.error('Error in handleOutstandingBonusDM:', error);
    throw error;
  }
}

async function handleAddBonus(interaction) {
  try {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'Manual bonus';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const record = await addBonus(user.id, user.username, amount, reason);
      await interaction.editReply({
        content: `✅ Added **${amount.toLocaleString()}** bonus to ${user.username} for: ${reason}`
      });
    } catch (error) {
      logger.error(`Failed to add bonus for ${user.id}:`, error);
      await interaction.editReply({
        content: '❌ Failed to add bonus'
      });
    }
  } catch (error) {
    logger.error('Error in handleAddBonus:', error);
    throw error;
  }
}

async function handleLessBonus(interaction) {
  try {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'Manual deduction';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const record = await reduceBonus(user.id, user.username, amount, reason);
      await interaction.editReply({
        content: `✅ Deducted **${amount.toLocaleString()}** from ${user.username} for: ${reason}`
      });
    } catch (error) {
      logger.error(`Failed to reduce bonus for ${user.id}:`, error);
      await interaction.editReply({
        content: '❌ Failed to reduce bonus'
      });
    }
  } catch (error) {
    logger.error('Error in handleLessBonus:', error);
    throw error;
  }
}

async function handleBonusPaid(interaction) {
  try {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const records = await markBonusPaid(user.id, amount);
      const bonusSummary = await getUserBonusSummary(user.id);
      
      await interaction.editReply({
        content: `✅ Marked **${amount.toLocaleString()}** as paid for ${user.username}\n` +
                 `💰 New Outstanding: **${bonusSummary.outstanding.toLocaleString()}**`
      });
      
      // Notify user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('💰 Bonus Payment Received')
          .setDescription(`You've received payment for your bonuses`)
          .addFields(
            { name: 'Amount Paid', value: `**${amount.toLocaleString()}**`, inline: true },
            { name: 'New Outstanding', value: `**${bonusSummary.outstanding.toLocaleString()}**`, inline: true }
          );
        
        await user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        logger.warn(`Failed to send payment DM to ${user.tag}:`, dmError);
      }
    } catch (error) {
      logger.error(`Failed to mark bonus as paid for ${user.id}:`, error);
      await interaction.editReply({
        content: '❌ Failed to mark bonus as paid'
      });
    }
  } catch (error) {
    logger.error('Error in handleBonusPaid:', error);
    throw error;
  }
}

async function handleListBonus(interaction) {
  try {
    await interaction.deferReply();
    
    try {
      const records = await getAllBonusRecords();
      if (records.length === 0) {
        return await interaction.editReply('No bonus records found');
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
      logger.info(`Displayed bonus list for ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Failed to retrieve bonus records:', error);
      await interaction.editReply('❌ Failed to retrieve bonus records');
    }
  } catch (error) {
    logger.error('Error in handleListBonus:', error);
    throw error;
  }
}

async function handleKills(interaction) {
  try {
    const user = interaction.options.getUser('user');
    const eventName = interaction.options.getString('event');
    const date = interaction.options.getString('date');
    const kills = interaction.options.getInteger('count');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const record = await recordKills(user.id, user.username, eventName, date, kills);
      
      await interaction.editReply({
        content: `✅ Recorded **${kills}** kills for ${user.username} at ${eventName} on ${date}\n` +
                 `💰 Bonus Earned: **${record.amount.toLocaleString()}**`
      });
      
      // Notify user
      try {
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
      } catch (dmError) {
        logger.warn(`Failed to send kills DM to ${user.tag}:`, dmError);
      }
    } catch (error) {
      logger.error(`Failed to record kills for ${user.id}:`, error);
      await interaction.editReply({
        content: `❌ Failed to record kills: ${error.message}`
      });
    }
  } catch (error) {
    logger.error('Error in handleKills:', error);
    throw error;
  }
}

async function handleParachute(interaction) {
  try {
    const user = interaction.options.getUser('user');
    const eventName = interaction.options.getString('event');
    const date = interaction.options.getString('date');
    const parachutes = interaction.options.getInteger('count');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const record = await recordParachutes(user.id, user.username, eventName, date, parachutes);
      
      await interaction.editReply({
        content: `✅ Recorded **${parachutes}** parachutes for ${user.username} at ${eventName} on ${date}\n` +
                 `💰 Bonus Earned: **${record.amount.toLocaleString()}**`
      });
      
      // Notify user
      try {
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
      } catch (dmError) {
        logger.warn(`Failed to send parachute DM to ${user.tag}:`, dmError);
      }
    } catch (error) {
      logger.error(`Failed to record parachutes for ${user.id}:`, error);
      await interaction.editReply({
        content: `❌ Failed to record parachutes: ${error.message}`
      });
    }
  } catch (error) {
    logger.error('Error in handleParachute:', error);
    throw error;
  }
}

// Event selection handler with improved error handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'event-select') return;

  try {
    // Check if already handled
    if (interaction.replied || interaction.deferred) {
      logger.warn(`Event select interaction ${interaction.id} already handled`);
      return;
    }

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
    logger.debug(`Event ${eventName} selected by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error in event select handler:', error);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ 
          content: '❌ Failed to process event selection', 
          ephemeral: true 
        });
      } catch (replyError) {
        logger.error('Failed to send event select error:', replyError);
      }
    }
  }
});

// Date selection handler with improved error handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'date-select') return;

  try {
    // Check if already handled
    if (interaction.replied || interaction.deferred) {
      logger.warn(`Date select interaction ${interaction.id} already handled`);
      return;
    }

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
      logger.debug(`Tomorrow date selected for ${eventName} by ${interaction.user.tag}`);
    } else if (dateOption === 'custom') {
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n\n📅 Please enter a custom date (DD/MM/YYYY):`,
        components: []
      });
      setupDateCollector(interaction, eventName);
      logger.debug(`Custom date selected for ${eventName} by ${interaction.user.tag}`);
    }
  } catch (error) {
    logger.error('Error in date select handler:', error);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ 
          content: '❌ Failed to process date selection', 
          ephemeral: true 
        });
      } catch (replyError) {
        logger.error('Failed to send date select error:', replyError);
      }
    }
  }
});

// Helper functions with improved error handling
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
        setTimeout(() => reply.delete().catch(() => {}), 3000);
        return;
      }

      await processAttendance(eventName, date, users, mentionMessage, interaction.channel);
      await mentionMessage.delete().catch(() => {});
      logger.info(`Processed attendance for ${users.size} users for ${eventName}`);
    } catch (error) {
      logger.error('Error in mention collector:', error);
    }
  });

  mentionCollector.on('end', (collected, reason) => {
    if (reason === 'time') {
      logger.debug(`Mention collector timed out for ${interaction.user.tag}`);
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
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        await dateMessage.delete().catch(() => {});
        return;
      }

      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n📅 Date: **${dateInput}**\n\n🔹 Mention participants: (@user1 @user2...)`,
        components: []
      });
      setupMentionCollector(interaction, eventName, dateInput);
      await dateMessage.delete().catch(() => {});
      logger.debug(`Custom date ${dateInput} set for ${eventName} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in date collector:', error);
    }
  });

  dateCollector.on('end', (collected, reason) => {
    if (reason === 'time') {
      logger.debug(`Date collector timed out for ${interaction.user.tag}`);
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
        logger.error(`Failed to process ${user.tag}:`, error);
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

    logger.info(`Processed attendance for ${successful} users for event ${eventName}`);
  } catch (error) {
    logger.error('Attendance Processing Error:', error);
    try {
      await sourceMessage.reply({
        content: '❌ An error occurred while processing attendance',
        ephemeral: true
      });
    } catch (replyError) {
      logger.error('Failed to send attendance error:', replyError);
    }
  }
}

// Error handling
process.on('unhandledRejection', error => {
  logger.error('⚠️ Unhandled rejection:', error);
});

process.on('uncaughtException', error => {
  logger.error('⚠️ Uncaught exception:', error);
  // In a production environment, you might want to gracefully shut down here
});

process.on('SIGTERM', () => {
  logger.info('🛑 Shutting down gracefully...');
  client.destroy().catch(err => logger.error('Error destroying client:', err));
  mongoose.disconnect().catch(err => logger.error('Error disconnecting MongoDB:', err));
  process.exit(0);
});

// Start bot
client.login(CONFIG.DISCORD_TOKEN)
  .then(() => logger.info('🤖 Bot login successful'))
  .catch(error => {
    logger.error('❌ Failed to login:', error);
    process.exit(1);
  });