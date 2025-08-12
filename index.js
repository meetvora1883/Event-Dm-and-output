const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
const { MongoClient } = require('mongodb');
const { stringify } = require('csv-stringify/sync');
require('dotenv').config();

// Add port for Render.com
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// Configuration
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS ? process.env.ADMIN_ROLE_IDS.split(',') : ['1368991091868700773', '1368991334513508532'],
  HIGH_COMMAND_ROLE_IDS: process.env.HIGH_COMMAND_ROLE_IDS ? process.env.HIGH_COMMAND_ROLE_IDS.split(',') : ['1398888612375826520', '1398888612375826519', '1398888612375826516'],
  BOT_PREFIX: process.env.BOT_PREFIX || '!',
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID || null,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  BONUS_LOG_CHANNEL_ID: process.env.BONUS_LOG_CHANNEL_ID || '1398888616532643862',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  OUTPUT_CHANNEL_NAME: process.env.OUTPUT_CHANNEL_NAME || 'event-attendance'
};

// MongoDB setup
let db;
let bonusCollection;
async function connectToMongoDB() {
  try {
    const mongoClient = new MongoClient(CONFIG.MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db('discord_bot');
    bonusCollection = db.collection('bonus_data');
    console.log(`\x1b[32m[${new Date().toISOString()}] ✅ Connected to MongoDB\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m[${new Date().toISOString()}] ❌ MongoDB connection failed: ${error}\x1b[0m`);
    process.exit(1);
  }
}

// Event names - simplified to avoid special character issues
const EVENT_NAMES = [
  { name: "Family raid (Attack)", value: "family_raid_attack" },
  { name: "Family raid (Protection)", value: "family_raid_protection" },
  { name: "State Object", value: "state_object" },
  { name: "Turf", value: "turf" },
  { name: "Store robbery", value: "store_robbery" },
  { name: "Caravan delivery", value: "caravan_delivery" },
  { name: "Attacking Prison", value: "attacking_prison" },
  { name: "Harbor (battle for the docks)", value: "harbor" },
  { name: "Weapons Factory", value: "weapons_factory" },
  { name: "Drug Lab", value: "drug_lab" },
  { name: "Factory of RP tickets", value: "rp_tickets_factory" },
  { name: "Foundry", value: "foundry" },
  { name: "Mall", value: "mall" },
  { name: "Business War", value: "business_war" },
  { name: "Vineyard", value: "vineyard" },
  { name: "Attacking Prison (on Friday)", value: "attacking_prison_friday" },
  { name: "King of Cayo Perico Island (on Wednesday and Sunday)", value: "king_of_cayo" },
  { name: "Leftover Components", value: "leftover_components" },
  { name: "Rating Battle", value: "rating_battle" },
  { name: "Aircraft Carrier (on Sunday)", value: "aircraft_carrier" },
  { name: "Bank Robbery", value: "bank_robbery" },
  { name: "Hotel Takeover", value: "hotel_takeover" },
  { name: "Family War", value: "family_war" },
  { name: "Money Printing Machine", value: "money_printing" },
  { name: "Informal (Battle for business for unofficial organization)", value: "informal_battle" }
];

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
          name: 'payer',
          description: 'The user who paid the bonus',
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
      name: 'lesspaidbonus',
      description: 'Reduce paid bonus amount from a member',
      options: [
        {
          name: 'user',
          description: 'The user to reduce paid bonus from',
          type: 6, // USER type
          required: true
        },
        {
          name: 'amount',
          description: 'Amount to reduce from paid',
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
      name: 'listbonus',
      description: 'List all members bonus summary',
      options: []
    },
    {
      name: 'bonus',
      description: 'Bonus management commands',
      options: [
        {
          name: 'csv',
          description: 'Export bonus data as CSV',
          type: 1, // SUB_COMMAND
          options: []
        }
      ]
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
    },
    {
      name: 'dm_outstanding-all',
      description: 'Send DM with outstanding bonus summary to all members',
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
function getTodayDate() {
  return formatDate(new Date());
}

function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}

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

// Time validation
function isValidTime(time) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
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
client.on('ready', async () => {
  console.log(`\n\x1b[32m[${new Date().toISOString()}] 🚀 Bot connected as ${client.user.tag}\x1b[0m`);
  console.log(`[${new Date().toISOString()}] 📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`[${new Date().toISOString()}] 📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID} (${CONFIG.OUTPUT_CHANNEL_NAME})`);
  console.log(`[${new Date().toISOString()}] 👑 Admin Roles: ${CONFIG.ADMIN_ROLE_IDS.join(', ')}`);
  console.log(`[${new Date().toISOString()}] 👑 High Command Roles: ${CONFIG.HIGH_COMMAND_ROLE_IDS.join(', ')}`);
  
  // Log server member statistics
  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.members.fetch();
    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    console.log(`[${new Date().toISOString()}] 👥 Server Members: ${totalMembers} total, ${onlineMembers} online`);
  }
  
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
  
  await connectToMongoDB();
  await registerCommands();
  
  // Start HTTP server for Render.com
  const server = require('http').createServer((req, res) => {
    res.writeHead(200);
    res.end('Discord Bot is running');
  });
  
  server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 🌐 HTTP server running on port ${PORT}`);
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] ❌ Failed to start HTTP server: ${err.message}`);
  });
});

// Utility functions
function hasAdminRole(member) {
  return member.roles.cache.some(role => CONFIG.ADMIN_ROLE_IDS.includes(role.id));
}

function isHighCommand(member) {
  return member.roles.cache.some(role => CONFIG.HIGH_COMMAND_ROLE_IDS.includes(role.id));
}

function isAllowedChannel(channelId) {
  return !CONFIG.COMMAND_CHANNEL_ID || channelId === CONFIG.COMMAND_CHANNEL_ID;
}

async function getMemberDisplayInfo(guild, userId) {
  try {
    const member = await guild.members.fetch(userId);
    return {
      nickname: member.nickname,
      username: member.user.username,
      tag: member.user.tag,
      displayName: member.nickname || member.user.username,
      isHighCommand: isHighCommand(member)
    };
  } catch (error) {
    console.error(`Error fetching member ${userId}:`, error);
    return {
      nickname: null,
      username: null,
      tag: null,
      displayName: null,
      isHighCommand: false
    };
  }
}

// Initialize or get bonus data for a user
async function getUserBonus(userId) {
  try {
    let userBonus = await bonusCollection.findOne({ userId });
    
    if (!userBonus) {
      userBonus = {
        userId,
        total: 0,
        paid: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await bonusCollection.insertOne(userBonus);
    }
    
    return userBonus;
  } catch (error) {
    console.error('Error getting user bonus:', error);
    throw error;
  }
}

// Update user bonus in database
async function updateUserBonus(userId, updateData) {
  try {
    const updateDoc = {
      $set: {
        ...updateData,
        updatedAt: new Date()
      }
    };
    
    if (updateData.history) {
      updateDoc.$push = { history: { $each: updateData.history } };
      delete updateDoc.$set.history;
    }
    
    await bonusCollection.updateOne(
      { userId },
      updateDoc,
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating user bonus:', error);
    throw error;
  }
}

// Log bonus action to the bonus log channel
async function logBonusAction(action, executor, targetUser, amount, note = '', payer = null) {
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

    if (payer) {
      embed.addFields({ name: '💳 Payer', value: payer.tag, inline: true });
    }

    if (note) {
      embed.addFields({ name: '📝 Note', value: note });
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging bonus action:', error);
  }
}

// Send DM to user and return status
async function sendDM(user, embed) {
  try {
    const dm = await user.createDM();
    await dm.send({ embeds: [embed] });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
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
            '`/lesspaidbonus` - Reduce paid bonus amount\n' +
            '`/listbonus` - List all members bonus summary\n' +
            '`/bonus csv` - Export bonus data as CSV\n' +
            '`/dmoutstanding` - Send DM with outstanding bonus summary to a member\n' +
            '`/dm_outstanding-all` - Send DM with outstanding bonus summary to all members'
          },
          { name: '📝 Usage', value: '1. Use `/attendance`\n2. Select event\n3. Enter bonus amount\n4. Choose date option\n5. Enter time (24H format)\n6. Mention participants' },
          { name: '📁 Channels', value: `• POV Submissions: <#${CONFIG.POV_CHANNEL_ID}>\n• Output: <#${CONFIG.OUTPUT_CHANNEL_ID}> (${CONFIG.OUTPUT_CHANNEL_NAME})\n• Bonus Logs: <#${CONFIG.BONUS_LOG_CHANNEL_ID}>` }
        )
        .setFooter({ text: 'Slayers Family Events' });

      await interaction.reply({ embeds: [helpEmbed], flags: 64 });
      logCommand(interaction.user, '/help', 'SUCCESS');
    }

    if (interaction.commandName === 'attendance') {
      logCommand(interaction.user, '/attendance', 'START');

      // Permission check
      if (!hasAdminRole(interaction.member)) {
        logCommand(interaction.user, '/attendance', 'FAIL', 'Insufficient permissions');
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          flags: 64
        });
      }

      // Channel check
      if (!isAllowedChannel(interaction.channelId)) {
        logCommand(interaction.user, '/attendance', 'FAIL', 'Wrong channel');
        return interaction.reply({
          content: `❌ Use <#${CONFIG.COMMAND_CHANNEL_ID}> for commands`,
          flags: 64
        });
      }

      // Create event selection dropdown
      const eventSelect = new StringSelectMenuBuilder()
        .setCustomId('event-select')
        .setPlaceholder('Choose event')
        .addOptions(
          EVENT_NAMES.map(event => ({
            label: event.name.length > 25 ? `${event.name.substring(0, 22)}...` : event.name,
            value: event.value,
            description: `Select ${event.name}`
          }))
        );

      const row = new ActionRowBuilder().addComponents(eventSelect);
      
      await interaction.reply({
        content: '📋 Select an event:',
        components: [row],
        flags: 64
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
    } else if (interaction.commandName === 'lesspaidbonus') {
      await handleLessPaidBonus(interaction);
    } else if (interaction.commandName === 'listbonus') {
      await handleListBonus(interaction);
    } else if (interaction.commandName === 'bonus') {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand === 'csv') {
        await handleBonusCSV(interaction);
      }
    } else if (interaction.commandName === 'dmoutstanding') {
      await handleDMOutstanding(interaction);
    } else if (interaction.commandName === 'dm_outstanding-all') {
      await handleDMOutstandingAll(interaction);
    }
  } catch (error) {
    logCommand(interaction.user, `/${interaction.commandName}`, 'FAIL', error.message);
    console.error('Error Details:', error.stack);

    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Command failed unexpectedly',
        flags: 64
      }).catch(console.error);
    }
  }
});

// Event selection handler with improved error handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'event-select') return;

  try {
    // Defer the update immediately to prevent timeout
    await interaction.deferUpdate();
    
    const eventValue = interaction.values[0];
    const eventName = EVENT_NAMES.find(e => e.value === eventValue)?.name || eventValue;
    
    logCommand(interaction.user, '/attendance [select]', 'SUCCESS', `Selected: ${eventName}`);

    // Ask for bonus amount
    await interaction.editReply({
      content: `✅ Selected: **${eventName}**\n\n💰 Please enter the bonus amount for this event (enter 0 if no bonus):`,
      components: []
    });

    // Set up bonus amount collector with improved error handling
    const amountFilter = m => m.author.id === interaction.user.id;
    const amountCollector = interaction.channel.createMessageCollector({ 
      filter: amountFilter,
      time: 60000,
      max: 1
    });

    amountCollector.on('collect', async amountMessage => {
      try {
        const bonusAmount = parseInt(amountMessage.content.trim());
        
        if (isNaN(bonusAmount)) {
          logCommand(interaction.user, '/attendance [amount]', 'WARN', 'Invalid amount format');
          const reply = await amountMessage.reply({
            content: '❌ Please enter a valid number for the bonus amount',
            allowedMentions: { parse: [] }
          });
          setTimeout(() => reply.delete(), 5000);
          await amountMessage.delete().catch(() => {});
          return;
        }

        if (bonusAmount < 0) {
          logCommand(interaction.user, '/attendance [amount]', 'WARN', 'Negative amount');
          const reply = await amountMessage.reply({
            content: '❌ Bonus amount cannot be negative',
            allowedMentions: { parse: [] }
          });
          setTimeout(() => reply.delete(), 5000);
          await amountMessage.delete().catch(() => {});
          return;
        }

        logCommand(interaction.user, '/attendance [amount]', 'SUCCESS', `Bonus amount: $${bonusAmount}`);

        // Create date selection options
        const today = getTodayDate();
        const yesterday = getYesterdayDate();
        const tomorrow = getTomorrowDate();
        
        const dateSelect = new StringSelectMenuBuilder()
          .setCustomId('date-select')
          .setPlaceholder('Choose date option')
          .addOptions([
            { 
              label: `Today (${today})`, 
              value: 'today',
              description: `Bonus: $${bonusAmount}`,
              emoji: '📅'
            },
            { 
              label: `Yesterday (${yesterday})`, 
              value: 'yesterday',
              description: `Bonus: $${bonusAmount}`,
              emoji: '📅'
            },
            { 
              label: `Tomorrow (${tomorrow})`, 
              value: 'tomorrow',
              description: `Bonus: $${bonusAmount}`,
              emoji: '📅'
            },
            { 
              label: 'Custom date', 
              value: 'custom',
              description: `Bonus: $${bonusAmount}`,
              emoji: '📅'
            }
          ]);

        const row = new ActionRowBuilder().addComponents(dateSelect);
        
        await interaction.editReply({
          content: `✅ Event: **${eventName}**\n💰 Bonus: **$${bonusAmount}**\n\n📅 Choose date option:`,
          components: [row]
        });

        await amountMessage.delete().catch(() => {});
      } catch (error) {
        logCommand(interaction.user, '/attendance [amount]', 'FAIL', error.message);
        console.error('Error processing amount:', error);
      }
    });

    amountCollector.on('end', collected => {
      if (collected.size === 0) {
        logCommand(interaction.user, '/attendance [amount]', 'WARN', 'No amount collected - timeout');
        interaction.followUp({
          content: '⏱️ Timed out waiting for bonus amount input. Please start over.',
          flags: 64
        }).catch(console.error);
      }
    });
  } catch (error) {
    logCommand(interaction.user, '/attendance [select]', 'FAIL', error.message);
    console.error('Error in event selection:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your selection',
        flags: 64,
        ephemeral: true
      }).catch(console.error);
    } else {
      await interaction.followUp({
        content: '❌ An error occurred while processing your selection',
        flags: 64,
        ephemeral: true
      }).catch(console.error);
    }
  }
});

// Date selection handler with improved error handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'date-select') return;

  try {
    await interaction.deferUpdate();
    const dateOption = interaction.values[0];
    const eventMatch = interaction.message.content.match(/\*\*(.*?)\*\*\n💰 Bonus: \*\*\$(.*?)\*\*/);
    if (!eventMatch) {
      logCommand(interaction.user, '/attendance [date]', 'FAIL', 'Could not parse event info');
      return interaction.followUp({
        content: '❌ Could not parse event information. Please start over.',
        flags: 64
      });
    }
    
    const eventName = eventMatch[1];
    const eventBonus = parseInt(eventMatch[2]);
    
    let selectedDate;
    
    switch(dateOption) {
      case 'today':
        selectedDate = getTodayDate();
        break;
      case 'yesterday':
        selectedDate = getYesterdayDate();
        break;
      case 'tomorrow':
        selectedDate = getTomorrowDate();
        break;
      case 'custom':
        // Ask for custom date
        await interaction.editReply({
          content: `✅ Event: **${eventName}**\n💰 Bonus: **$${eventBonus}**\n\n📅 Please enter a custom date (DD/MM/YYYY):`,
          components: []
        });
        
        // Set up date collector with improved error handling
        const dateFilter = m => m.author.id === interaction.user.id;
        const dateCollector = interaction.channel.createMessageCollector({ 
          filter: dateFilter, 
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

            selectedDate = dateInput;
            logCommand(interaction.user, '/attendance [date]', 'SUCCESS', `Custom date: ${selectedDate}`);
            await askForTime(interaction, eventName, eventBonus, selectedDate);
            await dateMessage.delete().catch(() => {});
          } catch (error) {
            logCommand(interaction.user, '/attendance [date]', 'FAIL', error.message);
            console.error('Error processing custom date:', error);
          }
        });

        dateCollector.on('end', collected => {
          if (collected.size === 0) {
            logCommand(interaction.user, '/attendance [date]', 'WARN', 'No date collected - timeout');
            interaction.followUp({
              content: '⏱️ Timed out waiting for date input. Please start over.',
              flags: 64
            }).catch(console.error);
          }
        });
        
        return;
      default:
        return;
    }
    
    if (selectedDate) {
      logCommand(interaction.user, '/attendance [date]', 'SUCCESS', `Selected date: ${selectedDate}`);
      await askForTime(interaction, eventName, eventBonus, selectedDate);
    }
  } catch (error) {
    logCommand(interaction.user, '/attendance [date]', 'FAIL', error.message);
    console.error('Error in date selection:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing date selection',
        flags: 64,
        ephemeral: true
      }).catch(console.error);
    } else {
      await interaction.followUp({
        content: '❌ An error occurred while processing date selection',
        flags: 64,
        ephemeral: true
      }).catch(console.error);
    }
  }
});

// Ask for time handler with improved error handling
async function askForTime(interaction, eventName, eventBonus, date) {
  try {
    await interaction.editReply({
      content: `✅ Event: **${eventName}**\n📅 Date: **${date}**\n💰 Bonus: **$${eventBonus}**\n\n⏰ Please enter the time in 24H format (HH:MM):`,
      components: []
    });

    // Set up time collector with improved error handling
    const timeFilter = m => m.author.id === interaction.user.id;
    const timeCollector = interaction.channel.createMessageCollector({ 
      filter: timeFilter, 
      time: 60000,
      max: 1
    });

    timeCollector.on('collect', async timeMessage => {
      try {
        const timeInput = timeMessage.content.trim();
        
        // Validate time
        if (!isValidTime(timeInput)) {
          logCommand(interaction.user, '/attendance [time]', 'WARN', 'Invalid time format');
          const reply = await timeMessage.reply({
            content: '❌ Invalid time format. Please use HH:MM (24-hour format)',
            allowedMentions: { parse: [] }
          });
          setTimeout(() => reply.delete(), 5000);
          await timeMessage.delete().catch(() => {});
          return;
        }

        logCommand(interaction.user, '/attendance [time]', 'SUCCESS', `Time: ${timeInput}`);
        
        // Now ask for participants
        await interaction.editReply({
          content: `✅ Event: **${eventName}**\n📅 Date: **${date}**\n⏰ Time: **${timeInput}**\n💰 Bonus: **$${eventBonus}**\n\n🔹 Mention participants: (@user1 @user2...)`,
          components: []
        });

        // Set up user mention collector with improved error handling
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
              logCommand(interaction.user, '/attendance [mentions]', 'WARN', 'No users mentioned');
              const reply = await mentionMessage.reply({
                content: '❌ Please mention at least one user',
                allowedMentions: { parse: [] }
              });
              setTimeout(() => reply.delete(), 3000);
              return;
            }

            logCommand(interaction.user, '/attendance [mentions]', 'DEBUG', `${users.size} users mentioned`);
            await processAttendance(eventName, date, timeInput, users, mentionMessage, interaction.channel, eventBonus);
            await mentionMessage.delete().catch(() => {});
          } catch (error) {
            logCommand(interaction.user, '/attendance [process]', 'FAIL', error.message);
            console.error('Error processing mentions:', error);
          }
        });

        mentionCollector.on('end', collected => {
          if (collected.size === 0) {
            logCommand(interaction.user, '/attendance [mentions]', 'WARN', 'No participants collected - timeout');
            interaction.followUp({
              content: '⏱️ Timed out waiting for participants. Please start over.',
              flags: 64
            }).catch(console.error);
          }
        });

        await timeMessage.delete().catch(() => {});
      } catch (error) {
        logCommand(interaction.user, '/attendance [time]', 'FAIL', error.message);
        console.error('Error processing time:', error);
      }
    });

    timeCollector.on('end', collected => {
      if (collected.size === 0) {
        logCommand(interaction.user, '/attendance [time]', 'WARN', 'No time collected - timeout');
        interaction.followUp({
          content: '⏱️ Timed out waiting for time input. Please start over.',
          flags: 64
        }).catch(console.error);
      }
    });
  } catch (error) {
    logCommand(interaction.user, '/attendance [time]', 'FAIL', error.message);
    console.error('Error in time collection:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing time input',
        flags: 64,
        ephemeral: true
      }).catch(console.error);
    } else {
      await interaction.followUp({
        content: '❌ An error occurred while processing time input',
        flags: 64,
        ephemeral: true
      }).catch(console.error);
    }
  }
}

// Process attendance function with bonus tracking
async function processAttendance(eventName, date, time, users, sourceMessage, commandChannel, eventBonus) {
  try {
    // Validate channels
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    
    if (!outputChannel) {
      const errorMsg = 'Output channel not found';
      logCommand(sourceMessage.author, 'processAttendance', 'FAIL', errorMsg);
      await sourceMessage.reply({
        content: '❌ Configuration error: Output channel not found',
        flags: 64
      });
      return;
    }

    // Get all member display info and check for high command
    const memberInfo = await Promise.all(
      Array.from(users.values()).map(async user => {
        const member = await sourceMessage.guild.members.fetch(user.id);
        const isHighCmd = isHighCommand(member);
        const info = await getMemberDisplayInfo(sourceMessage.guild, user.id);
        return {
          user,
          ...info,
          isHighCommand: isHighCmd
        };
      })
    );

    // Calculate total bonus for all participants
    let totalBonusAwarded = 0;
    let highCommandMembers = [];
    const dmResults = [];

    // Process each user
    for (const { user, nickname, username, tag, displayName, isHighCommand } of memberInfo) {
      try {
        if (isHighCommand) {
          // Send special DM to high command members
          const highCmdDmEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎉 Event Attendance Recorded')
            .setDescription('Thank you for participating as High Command!')
            .addFields(
              { name: '📌 Event', value: `**${eventName}**`, inline: true },
              { name: '📅 Date', value: date, inline: true },
              { name: '⏰ Time', value: time, inline: true },
              { 
                name: '⚠️ Bonus Status', 
                value: 'As High Command, you are not eligible for event bonuses',
                inline: false
              },
              { 
                name: '📸 Upload Instructions', 
                value: `Submit your POV to: <#${CONFIG.POV_CHANNEL_ID}>\n\n` +
                       `**Required format:**\n\`\`\`\n"${eventName} | ${displayName}"\n"${date} ${time}"\n\`\`\``
              }
            )
            .setFooter({ text: 'Slayers Family Events' });

          const dmResult = await sendDM(user, highCmdDmEmbed);
          highCommandMembers.push({
            name: displayName || username,
            dmStatus: dmResult.success ? '✅' : '❌'
          });
          logCommand(sourceMessage.author, 'processAttendance', 'DEBUG', `High command DM sent to ${tag}`);
          continue;
        }

        // Process regular members
        if (eventBonus > 0) {
          const userBonus = await getUserBonus(user.id);
          const newTotal = userBonus.total + eventBonus;
          totalBonusAwarded += eventBonus;
          
          await updateUserBonus(user.id, {
            total: newTotal,
            history: [{
              type: 'event',
              amount: eventBonus,
              reason: `Attended ${eventName}`,
              date: new Date().toISOString(),
              by: sourceMessage.author.id
            }]
          });

          const outstanding = newTotal - userBonus.paid;

          const dmEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🎉 Event Attendance Recorded')
            .setDescription('Thank you for being part of the Slayers Family!')
            .addFields(
              { name: '📌 Event', value: `**${eventName}**`, inline: true },
              { name: '📅 Date', value: date, inline: true },
              { name: '⏰ Time', value: time, inline: true },
              { 
                name: '💰 Bonus Earned', 
                value: `$${eventBonus}`,
                inline: true
              },
              { 
                name: '💵 Total Bonus', 
                value: `$${newTotal}`,
                inline: true
              },
              { 
                name: '💸 Outstanding', 
                value: `$${Math.max(0, outstanding)}`,
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
                       `**Required format:**\n\`\`\`\n"${eventName} | ${displayName}"\n"${date} ${time}"\n\`\`\``
              }
            )
            .setFooter({ text: 'Slayers Family Events' });

          const dmResult = await sendDM(user, dmEmbed);
          dmResults.push({
            user: displayName || username,
            success: dmResult.success,
            error: dmResult.error
          });

          if (dmResult.success) {
            logCommand(sourceMessage.author, 'processAttendance', 'DEBUG', `DM sent to ${tag}`);
          } else {
            logCommand(sourceMessage.author, 'processAttendance', 'WARN', `Failed DM to ${tag}: ${dmResult.error}`);
          }
        } else {
          // For zero bonus events
          const dmEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🎉 Event Attendance Recorded')
            .setDescription('Thank you for being part of the Slayers Family!')
            .addFields(
              { name: '📌 Event', value: `**${eventName}**`, inline: true },
              { name: '📅 Date', value: date, inline: true },
              { name: '⏰ Time', value: time, inline: true },
              { 
                name: '💰 Bonus Earned', 
                value: 'Bonus will be added soon',
                inline: false
              },
              { 
                name: '📝 Note', 
                value: 'If you performed any activity (Like collect parachute, kills, etc...), Then bonus will be added soon.\n' +
                       'If Bonus was not received within 24 hours, please contact High Command to add bonus.',
                inline: false
              },
              { 
                name: '📸 Upload Instructions', 
                value: `Submit your POV to: <#${CONFIG.POV_CHANNEL_ID}>\n\n` +
                       `**Required format:**\n\`\`\`\n"${eventName} | ${displayName}"\n"${date} ${time}"\n\`\`\``
              }
            )
            .setFooter({ text: 'Slayers Family Events' });

          const dmResult = await sendDM(user, dmEmbed);
          dmResults.push({
            user: displayName || username,
            success: dmResult.success,
            error: dmResult.error
          });

          if (dmResult.success) {
            logCommand(sourceMessage.author, 'processAttendance', 'DEBUG', `DM sent to ${tag}`);
          } else {
            logCommand(sourceMessage.author, 'processAttendance', 'WARN', `Failed DM to ${tag}: ${dmResult.error}`);
          }
        }
      } catch (error) {
        logCommand(sourceMessage.author, 'processAttendance', 'ERROR', `Error processing ${tag}: ${error.message}`);
        if (isHighCommand) {
          highCommandMembers.push({
            name: username,
            dmStatus: '❌'
          });
        } else {
          dmResults.push({
            user: username,
            success: false,
            error: error.message
          });
        }
      }
    }

    // Prepare DM status message
    const dmStatus = dmResults.map(result => 
      `${result.success ? '✅' : '❌'} ${result.user}`
    ).join('\n');

    // Prepare high command status message
    let highCommandStatus = '';
    if (highCommandMembers.length > 0) {
      highCommandStatus = `\n\n👑 High Command Members (no bonus awarded):\n${highCommandMembers.map(m => `${m.dmStatus} ${m.name}`).join('\n')}`;
    }

    // Prepare output message with both mention and profile name
    const eligibleMembers = memberInfo.filter(({ isHighCommand }) => !isHighCommand);
    const outputContent = `**${eventName} - Attendance**\n**Date:** ${date}\n**Time:** ${time}\n` +
      (eventBonus > 0 ? `**Bonus Awarded:** $${eventBonus} per participant\n**Total Bonus Awarded:** $${totalBonusAwarded}\n\n` : '**No Bonus Awarded for this event**\n\n') +
      `✅ Participants (${eligibleMembers.length}):\n` +
      eligibleMembers.map(({ user, displayName }) => 
        `• <@${user.id}> (${displayName})`
      ).join('\n') +
      highCommandStatus;

    // Send to output channel
    await outputChannel.send({
      content: outputContent,
      allowedMentions: { users: Array.from(users.keys()) }
    });

    // Prepare reply message with DM status
    let replyMessage = `✅ Attendance recorded for ${users.size} users!\n` +
                       (eventBonus > 0 ? `💰 $${totalBonusAwarded} in bonuses awarded to ${eligibleMembers.length} eligible members\n` : '') +
                       `📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}> (${CONFIG.OUTPUT_CHANNEL_NAME})\n\n` +
                       `**DM Delivery Status:**\n${dmStatus}`;

    if (highCommandMembers.length > 0) {
      replyMessage += `\n\n👑 High Command Members (${highCommandMembers.length}):\n` +
                      highCommandMembers.map(m => `${m.dmStatus} ${m.name}`).join('\n');
    }

    // Send summary to command user
    await sourceMessage.reply({
      content: replyMessage,
      flags: 64
    });
    logCommand(sourceMessage.author, 'processAttendance', 'SUCCESS', 
      `Processed ${users.size} users (${eligibleMembers.length} eligible, ${highCommandMembers.length} high command)`);

  } catch (error) {
    logCommand(sourceMessage.author, 'processAttendance', 'FAIL', error.message);
    console.error(`[${new Date().toISOString()}] 🛑 Processing Error:`, error.stack);
    await sourceMessage.reply({
      content: '❌ An error occurred while processing attendance',
      flags: 64
    });
  }
}

// Start the bot
client.login(CONFIG.DISCORD_TOKEN).catch(error => {
  console.error(`\x1b[31m[${new Date().toISOString()}] 🛑 Failed to login: ${error.message}\x1b[0m`);
  process.exit(1);
});
