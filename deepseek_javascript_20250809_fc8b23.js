require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Initialize Discord Client
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
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID,
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID,
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || [],
  MANAGER_ROLE_IDS: process.env.MANAGER_ROLE_IDS?.split(',') || [],
  HIGH_COMMAND_ROLE_IDS: process.env.HIGH_COMMAND_ROLE_IDS?.split(',') || [],
  BOT_PREFIX: process.env.BOT_PREFIX || '!',
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  BONUS_LOG_CHANNEL_ID: process.env.BONUS_LOG_CHANNEL_ID,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  OUTPUT_CHANNEL_NAME: process.env.OUTPUT_CHANNEL_NAME || 'event-attendance',
  PUBLIC_COMMAND_CHANNEL_ID: process.env.PUBLIC_COMMAND_CHANNEL_ID
};

// Backup System
const BACKUP_DIR = './backups';
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

async function runBackup() {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${date}`);
  
  console.log(`💾 Starting backup to ${backupPath}`);
  
  try {
    const client = new MongoClient(CONFIG.MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const data = await db.collection(collection.name).find().toArray();
      fs.writeFileSync(
        path.join(backupPath, `${collection.name}.json`),
        JSON.stringify(data, null, 2)
      );
      console.log(`✅ Backed up ${collection.name} (${data.length} documents)`);
    }
    
    console.log(`📦 Backup completed successfully`);
    await client.close();
    return { success: true, path: backupPath };
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Schedule daily backups at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('🕒 Running scheduled backup...');
  runBackup();
});

// Enhanced Console Logging
function logCommand(user, command, status, message = '') {
  const commandEmojis = {
    attendance: '📋',
    addbonus: '💰➕',
    lessbonus: '💰➖',
    paidbonus: '💳✅',
    lesspaidbonus: '💳➖',
    listbonus: '📊',
    dmoutstanding: '📨',
    help: '❓',
    my_stats: '📈',
    my_bonus: '💰',
    my_achievements: '🏆',
    backupbonus: '💾'
  };

  const statusEmojis = {
    START: '🟡',
    SUCCESS: '🟢',
    FAIL: '🔴',
    WARN: '🟠',
    DEBUG: '🟣'
  };

  const emoji = commandEmojis[command] || '⚙️';
  const statusEmoji = statusEmojis[status] || '';
  
  console.log(
    `${emoji} ${statusEmoji} ${user?.tag || 'System'} ` +
    `${command} ${message}`
  );
}

// Date Utilities
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

// MongoDB Connection
let db;
let bonusCollection;
let auditCollection;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(CONFIG.MONGODB_URI);
    await client.connect();
    db = client.db('discord_bot');
    bonusCollection = db.collection('bonus_data');
    auditCollection = db.collection('audit_logs');
    logCommand(null, 'system', 'SUCCESS', 'Connected to MongoDB');
  } catch (error) {
    logCommand(null, 'system', 'FAIL', `MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

// Event Names
const EVENT_NAMES = [
  { name: "Family raid (Attack)", value: "family_raid_attack" },
  { name: "Family raid (Protection)", value: "family_raid_protection" },
  { name: "State Object (Attack)", value: "state_object_attack" },
  { name: "State Object (Protection)", value: "state_object_protection" },
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

// Bot Ready Event
client.on('ready', async () => {
  console.log(`\n✨ ${client.user.tag} is online!`);
  console.log(`🏰 Serving ${client.guilds.cache.size} guild(s)`);
  console.log(`👋 Invite: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=applications.commands%20bot`);
  
  await connectToMongoDB();
  await registerCommands();
});

// Command Registration
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
          type: 6,
          required: true
        },
        {
          name: 'amount',
          description: 'Bonus amount to add',
          type: 4,
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for the bonus',
          type: 3,
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
          type: 6,
          required: true
        },
        {
          name: 'amount',
          description: 'Bonus amount to reduce',
          type: 4,
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for the reduction',
          type: 3,
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
          type: 6,
          required: true
        },
        {
          name: 'amount',
          description: 'Amount to mark as paid',
          type: 4,
          required: true
        },
        {
          name: 'note',
          description: 'Payment note',
          type: 3,
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
          type: 6,
          required: true
        },
        {
          name: 'amount',
          description: 'Amount to reduce from paid',
          type: 4,
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for the reduction',
          type: 3,
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
          type: 6,
          required: true
        }
      ]
    },
    {
      name: 'dm_outstanding-all',
      description: 'Send DM with outstanding bonus summary to all members',
      options: []
    },
    {
      name: 'dm_all-achievements',
      description: 'Send DM with achievements summary to all members',
      options: []
    },
    {
      name: 'my_stats',
      description: 'View your personal stats',
      options: []
    },
    {
      name: 'my_bonus',
      description: 'View your bonus summary',
      options: []
    },
    {
      name: 'my_achievements',
      description: 'View your achievements',
      options: []
    },
    {
      name: 'backupbonus',
      description: 'Create a manual backup of bonus data',
      options: []
    }
  ];

  try {
    const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: commands });
    logCommand(null, 'system', 'SUCCESS', 'Registered slash commands');
  } catch (error) {
    logCommand(null, 'system', 'FAIL', `Command registration failed: ${error.message}`);
  }
}

// Permission Check
function hasAdminRole(member) {
  return member.roles.cache.some(role => CONFIG.ADMIN_ROLE_IDS.includes(role.id));
}

function hasManagerRole(member) {
  return member.roles.cache.some(role => CONFIG.MANAGER_ROLE_IDS.includes(role.id));
}

function isHighCommand(member) {
  return member.roles.cache.some(role => CONFIG.HIGH_COMMAND_ROLE_IDS.includes(role.id));
}

function checkPermission(member, commandName) {
  if (hasAdminRole(member)) return true;
  if (hasManagerRole(member)) return !['lessbonus', 'lesspaidbonus'].includes(commandName);
  if (isHighCommand(member)) return commandName === 'attendance';
  return ['my_stats', 'my_bonus', 'my_achievements'].includes(commandName);
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

// Command Handlers
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    if (!checkPermission(interaction.member, interaction.commandName)) {
      logCommand(interaction.user, interaction.commandName, 'FAIL', 'Insufficient permissions');
      return interaction.reply({
        content: '⛔ You lack permissions for this command.',
        ephemeral: true
      });
    }

    if (interaction.commandName === 'backupbonus') {
      logCommand(interaction.user, 'backupbonus', 'START');
      await interaction.deferReply({ ephemeral: true });
      
      const backupResult = await runBackup();
      
      if (backupResult.success) {
        logCommand(interaction.user, 'backupbonus', 'SUCCESS', backupResult.path);
        await interaction.editReply({
          content: `✅ Backup completed successfully!\nPath: \`${backupResult.path}\``,
          ephemeral: true
        });
      } else {
        logCommand(interaction.user, 'backupbonus', 'FAIL', backupResult.error);
        await interaction.editReply({
          content: `❌ Backup failed: ${backupResult.error}`,
          ephemeral: true
        });
      }
      return;
    }

    if (interaction.commandName === 'help') {
      logCommand(interaction.user, 'help', 'START');
      
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
            '`/dmoutstanding` - Send DM with outstanding bonus summary to a member\n' +
            '`/dm_outstanding-all` - Send DM with outstanding bonus summary to all members\n' +
            '`/dm_all-achievements` - Send DM with achievements summary to all members\n' +
            '`/backupbonus` - Create manual backup of bonus data'
          },
          { name: '👤 Personal Commands', value:
            '`/my_stats` - View your personal stats\n' +
            '`/my_bonus` - View your bonus summary\n' +
            '`/my_achievements` - View your achievements'
          },
          { name: '📝 Usage', value: '1. Use `/attendance`\n2. Select event\n3. Enter bonus amount\n4. Choose date option\n5. Mention participants' },
          { name: '📁 Channels', value: `• POV Submissions: <#${CONFIG.POV_CHANNEL_ID}>\n• Output: <#${CONFIG.OUTPUT_CHANNEL_ID}> (${CONFIG.OUTPUT_CHANNEL_NAME})\n• Bonus Logs: <#${CONFIG.BONUS_LOG_CHANNEL_ID}>` },
          { name: '👑 Permissions', value:
            '**Admins**: All commands\n' +
            '**Managers**: All except `/lessbonus` and `/lesspaidbonus`\n' +
            '**High Command**: Only `/attendance`\n' +
            '**Everyone**: Personal commands (`/my_*`)'
          }
        )
        .setFooter({ text: 'Slayers Family Events' });

      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      logCommand(interaction.user, 'help', 'SUCCESS');
      return;
    }

    if (interaction.commandName === 'attendance') {
      logCommand(interaction.user, 'attendance', 'START');

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
        ephemeral: true
      });
      logCommand(interaction.user, 'attendance', 'SUCCESS', 'Event menu displayed');
      return;
    }

    if (interaction.commandName === 'addbonus') {
      logCommand(interaction.user, 'addbonus', 'START');

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (amount <= 0) {
        logCommand(interaction.user, 'addbonus', 'FAIL', 'Invalid amount');
        return interaction.reply({
          content: '❌ Amount must be greater than 0',
          ephemeral: true
        });
      }

      const userBonus = await getUserBonus(user.id);
      const newTotal = userBonus.total + amount;
      
      await updateUserBonus(user.id, {
        total: newTotal,
        history: [{
          type: 'add',
          amount,
          reason,
          date: new Date().toISOString(),
          by: interaction.user.id
        }]
      });

      await logBonusAction('added', interaction.user, user, amount, reason);

      const dmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💰 Bonus Added')
        .setDescription(`You've received a bonus of $${amount}`)
        .addFields(
          { name: '📝 Reason', value: reason },
          { name: '💵 New Total Bonus', value: `$${newTotal}`, inline: true },
          { name: '💸 Outstanding', value: `$${Math.max(0, newTotal - userBonus.paid)}`, inline: true }
        )
        .setFooter({ text: 'Slayers Family Bonus System' });

      const dmResult = await sendDM(user, dmEmbed);
      
      if (dmResult.success) {
        logCommand(interaction.user, 'addbonus', 'DEBUG', `DM sent to ${user.tag}`);
        await interaction.reply({
          content: `✅ Added $${amount} bonus to ${user.tag}\n📝 Reason: ${reason}\n📩 DM Status: Sent successfully`,
          ephemeral: true
        });
      } else {
        logCommand(interaction.user, 'addbonus', 'WARN', `Failed DM to ${user.tag}: ${dmResult.error}`);
        await interaction.reply({
          content: `✅ Added $${amount} bonus to ${user.tag}\n📝 Reason: ${reason}\n⚠️ DM Status: Failed to send (user may have DMs disabled)`,
          ephemeral: true
        });
      }
      
      logCommand(interaction.user, 'addbonus', 'SUCCESS', `Added $${amount} to ${user.tag}`);
      return;
    }

    if (interaction.commandName === 'lessbonus') {
      logCommand(interaction.user, 'lessbonus', 'START');

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (amount <= 0) {
        logCommand(interaction.user, 'lessbonus', 'FAIL', 'Invalid amount');
        return interaction.reply({
          content: '❌ Amount must be greater than 0',
          ephemeral: true
        });
      }

      const userBonus = await getUserBonus(user.id);
      const maxReduction = userBonus.total - userBonus.paid;
      
      if (amount > maxReduction) {
        logCommand(interaction.user, 'lessbonus', 'FAIL', 'Amount exceeds available bonus');
        return interaction.reply({
          content: `❌ Cannot reduce more than the available bonus ($${maxReduction})`,
          ephemeral: true
        });
      }

      const newTotal = userBonus.total - amount;
      
      await updateUserBonus(user.id, {
        total: newTotal,
        history: [{
          type: 'reduce',
          amount,
          reason,
          date: new Date().toISOString(),
          by: interaction.user.id
        }]
      });

      await logBonusAction('reduced', interaction.user, user, amount, reason);

      const dmEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('💰 Bonus Reduced')
        .setDescription(`$${amount} has been deducted from your bonus`)
        .addFields(
          { name: '📝 Reason', value: reason },
          { name: '💵 New Total Bonus', value: `$${newTotal}`, inline: true },
          { name: '💸 Outstanding', value: `$${Math.max(0, newTotal - userBonus.paid)}`, inline: true }
        )
        .setFooter({ text: 'Slayers Family Bonus System' });

      const dmResult = await sendDM(user, dmEmbed);
      
      if (dmResult.success) {
        logCommand(interaction.user, 'lessbonus', 'DEBUG', `DM sent to ${user.tag}`);
        await interaction.reply({
          content: `✅ Reduced $${amount} bonus from ${user.tag}\n📝 Reason: ${reason}\n📩 DM Status: Sent successfully`,
          ephemeral: true
        });
      } else {
        logCommand(interaction.user, 'lessbonus', 'WARN', `Failed DM to ${user.tag}: ${dmResult.error}`);
        await interaction.reply({
          content: `✅ Reduced $${amount} bonus from ${user.tag}\n📝 Reason: ${reason}\n⚠️ DM Status: Failed to send (user may have DMs disabled)`,
          ephemeral: true
        });
      }
      
      logCommand(interaction.user, 'lessbonus', 'SUCCESS', `Reduced $${amount} from ${user.tag}`);
      return;
    }

    if (interaction.commandName === 'paidbonus') {
      logCommand(interaction.user, 'paidbonus', 'START');

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const note = interaction.options.getString('note') || 'No note provided';

      if (amount <= 0) {
        logCommand(interaction.user, 'paidbonus', 'FAIL', 'Invalid amount');
        return interaction.reply({
          content: '❌ Amount must be greater than 0',
          ephemeral: true
        });
      }

      const userBonus = await getUserBonus(user.id);
      const outstanding = userBonus.total - userBonus.paid;

      if (amount > outstanding) {
        logCommand(interaction.user, 'paidbonus', 'FAIL', 'Amount exceeds outstanding');
        return interaction.reply({
          content: `❌ Cannot mark more than the outstanding amount ($${outstanding}) as paid`,
          ephemeral: true
        });
      }

      const newPaid = userBonus.paid + amount;
      
      await updateUserBonus(user.id, {
        paid: newPaid,
        history: [{
          type: 'paid',
          amount,
          note,
          date: new Date().toISOString(),
          by: interaction.user.id
        }]
      });

      await logBonusAction('paid', interaction.user, user, amount, note);

      const dmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💰 Bonus Paid')
        .setDescription(`$${amount} of your bonus has been marked as paid`)
        .addFields(
          { name: '📝 Note', value: note },
          { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
          { name: '💳 Total Paid', value: `$${newPaid}`, inline: true },
          { name: '💸 Outstanding', value: `$${Math.max(0, userBonus.total - newPaid)}`, inline: true }
        )
        .setFooter({ text: 'Slayers Family Bonus System' });

      const dmResult = await sendDM(user, dmEmbed);
      
      if (dmResult.success) {
        logCommand(interaction.user, 'paidbonus', 'DEBUG', `DM sent to ${user.tag}`);
        await interaction.reply({
          content: `✅ Marked $${amount} as paid for ${user.tag}\n📝 Note: ${note}\n📩 DM Status: Sent successfully`,
          ephemeral: true
        });
      } else {
        logCommand(interaction.user, 'paidbonus', 'WARN', `Failed DM to ${user.tag}: ${dmResult.error}`);
        await interaction.reply({
          content: `✅ Marked $${amount} as paid for ${user.tag}\n📝 Note: ${note}\n⚠️ DM Status: Failed to send (user may have DMs disabled)`,
          ephemeral: true
        });
      }
      
      logCommand(interaction.user, 'paidbonus', 'SUCCESS', `Marked $${amount} as paid for ${user.tag}`);
      return;
    }

    if (interaction.commandName === 'lesspaidbonus') {
      logCommand(interaction.user, 'lesspaidbonus', 'START');

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (amount <= 0) {
        logCommand(interaction.user, 'lesspaidbonus', 'FAIL', 'Invalid amount');
        return interaction.reply({
          content: '❌ Amount must be greater than 0',
          ephemeral: true
        });
      }

      const userBonus = await getUserBonus(user.id);
      
      if (amount > userBonus.paid) {
        logCommand(interaction.user, 'lesspaidbonus', 'FAIL', 'Amount exceeds paid bonus');
        return interaction.reply({
          content: `❌ Cannot reduce more than the paid amount ($${userBonus.paid})`,
          ephemeral: true
        });
      }

      const newPaid = userBonus.paid - amount;
      
      await updateUserBonus(user.id, {
        paid: newPaid,
        history: [{
          type: 'reduce_paid',
          amount,
          reason,
          date: new Date().toISOString(),
          by: interaction.user.id
        }]
      });

      await logBonusAction('paid amount reduced', interaction.user, user, amount, reason);

      const dmEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('💰 Paid Bonus Reduced')
        .setDescription(`$${amount} has been deducted from your paid bonus`)
        .addFields(
          { name: '📝 Reason', value: reason },
          { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
          { name: '💳 New Paid Amount', value: `$${newPaid}`, inline: true },
          { name: '💸 Outstanding', value: `$${Math.max(0, userBonus.total - newPaid)}`, inline: true }
        )
        .setFooter({ text: 'Slayers Family Bonus System' });

      const dmResult = await sendDM(user, dmEmbed);
      
      if (dmResult.success) {
        logCommand(interaction.user, 'lesspaidbonus', 'DEBUG', `DM sent to ${user.tag}`);
        await interaction.reply({
          content: `✅ Reduced $${amount} from paid bonus for ${user.tag}\n📝 Reason: ${reason}\n📩 DM Status: Sent successfully`,
          ephemeral: true
        });
      } else {
        logCommand(interaction.user, 'lesspaidbonus', 'WARN', `Failed DM to ${user.tag}: ${dmResult.error}`);
        await interaction.reply({
          content: `✅ Reduced $${amount} from paid bonus for ${user.tag}\n📝 Reason: ${reason}\n⚠️ DM Status: Failed to send (user may have DMs disabled)`,
          ephemeral: true
        });
      }
      
      logCommand(interaction.user, 'lesspaidbonus', 'SUCCESS', `Reduced $${amount} from paid bonus for ${user.tag}`);
      return;
    }

    if (interaction.commandName === 'listbonus') {
      logCommand(interaction.user, 'listbonus', 'START');

      try {
        const allBonuses = await bonusCollection.find().toArray();
        
        if (allBonuses.length === 0) {
          logCommand(interaction.user, 'listbonus', 'DEBUG', 'No bonus data');
          return interaction.reply({
            content: 'ℹ️ No bonus data available yet',
            ephemeral: true
          });
        }

        const sortedBonuses = allBonuses.sort((a, b) => {
          const aOutstanding = a.total - a.paid;
          const bOutstanding = b.total - b.paid;
          return bOutstanding - aOutstanding;
        });

        const embeds = [];
        let currentEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('💰 Bonus Summary')
          .setDescription('List of all members with their bonus information');

        for (const userBonus of sortedBonuses) {
          try {
            const member = await interaction.guild.members.fetch(userBonus.userId);
            const outstanding = Math.max(0, userBonus.total - userBonus.paid);
            
            const fieldValue = `Total: $${userBonus.total}\n` +
                              `Paid: $${userBonus.paid}\n` +
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
            console.error(`Error fetching member ${userBonus.userId}:`, error);
          }
        }

        if (currentEmbed.data.fields?.length > 0) {
          embeds.push(currentEmbed);
        }

        if (embeds.length === 0) {
          logCommand(interaction.user, 'listbonus', 'DEBUG', 'No valid bonus data');
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

        for (let i = 1; i < embeds.length; i++) {
          await interaction.followUp({
            embeds: [embeds[i]],
            ephemeral: true
          });
        }

        logCommand(interaction.user, 'listbonus', 'SUCCESS', `Displayed ${sortedBonuses.length} entries`);
      } catch (error) {
        logCommand(interaction.user, 'listbonus', 'FAIL', error.message);
        await interaction.reply({
          content: '❌ Failed to fetch bonus data',
          ephemeral: true
        });
      }
      return;
    }

    if (interaction.commandName === 'dmoutstanding') {
      logCommand(interaction.user, 'dmoutstanding', 'START');

      const user = interaction.options.getUser('user');
      const userBonus = await getUserBonus(user.id);
      const outstanding = Math.max(0, userBonus.total - userBonus.paid);
      const member = await interaction.guild.members.fetch(user.id);
      const isHighCmd = isHighCommand(member);

      const dmEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('💰 Your Bonus Summary')
        .setDescription(isHighCmd ? 
          'As High Command, you are not eligible for event bonuses' : 
          'Here is your current bonus status')
        .addFields(
          { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
          { name: '💳 Total Paid', value: `$${userBonus.paid}`, inline: true },
          { 
            name: '💸 Outstanding', 
            value: isHighCmd ? '$0 (High Command)' : `$${outstanding}`, 
            inline: true 
          }
        )
        .setFooter({ text: 'Slayers Family Bonus System' });

      const dmResult = await sendDM(user, dmEmbed);
      
      if (dmResult.success) {
        logCommand(interaction.user, 'dmoutstanding', 'DEBUG', `DM sent to ${user.tag}`);
        await interaction.reply({
          content: `✅ Sent bonus summary DM to ${user.tag}\n📩 DM Status: Sent successfully`,
          ephemeral: true
        });
      } else {
        logCommand(interaction.user, 'dmoutstanding', 'FAIL', `Failed to send DM: ${dmResult.error}`);
        await interaction.reply({
          content: `❌ Failed to send DM to ${user.tag}. They might have DMs disabled.`,
          ephemeral: true
        });
      }
      
      logCommand(interaction.user, 'dmoutstanding', 'SUCCESS', `Attempted to send DM to ${user.tag}`);
      return;
    }

    if (interaction.commandName === 'dm_outstanding-all') {
      logCommand(interaction.user, 'dm_outstanding-all', 'START');

      await interaction.deferReply({ ephemeral: true });

      try {
        const allBonuses = await bonusCollection.find().toArray();
        
        if (allBonuses.length === 0) {
          logCommand(interaction.user, 'dm_outstanding-all', 'DEBUG', 'No bonus data');
          return interaction.editReply({
            content: 'ℹ️ No bonus data available yet'
          });
        }

        const dmResults = [];
        const highCommandResults = [];

        for (const userBonus of allBonuses) {
          try {
            const member = await interaction.guild.members.fetch(userBonus.userId);
            const isHighCmd = isHighCommand(member);
            const outstanding = isHighCmd ? 0 : Math.max(0, userBonus.total - userBonus.paid);

            if (outstanding === 0 && !isHighCmd) continue;

            const dmEmbed = new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle('💰 Your Bonus Summary')
              .setDescription(isHighCmd ? 
                'As High Command, you are not eligible for event bonuses' : 
                'Here is your current bonus status')
              .addFields(
                { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
                { name: '💳 Total Paid', value: `$${userBonus.paid}`, inline: true },
                { 
                  name: '💸 Outstanding', 
                  value: isHighCmd ? '$0 (High Command)' : `$${outstanding}`, 
                  inline: true 
                }
              )
              .setFooter({ text: 'Slayers Family Bonus System' });

            const dmResult = await sendDM(member.user, dmEmbed);
            
            if (isHighCmd) {
              highCommandResults.push({
                user: member.displayName || member.user.username,
                success: dmResult.success,
                error: dmResult.error
              });
            } else {
              dmResults.push({
                user: member.displayName || member.user.username,
                success: dmResult.success,
                outstanding: outstanding
              });
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error processing member ${userBonus.userId}:`, error);
            dmResults.push({
              user: `Unknown (${userBonus.userId})`,
              success: false,
              error: error.message
            });
          }
        }

        let summaryMessage = '📊 Outstanding Bonus DM Summary:\n\n';
        
        if (dmResults.length > 0) {
          summaryMessage += '**Members with Outstanding Bonus:**\n';
          summaryMessage += dmResults.map(result => 
            `${result.success ? '✅' : '❌'} ${result.user} - $${result.outstanding}`
          ).join('\n');
        } else {
          summaryMessage += 'ℹ️ No members with outstanding bonus found\n';
        }

        if (highCommandResults.length > 0) {
          summaryMessage += '\n\n**High Command Members (No Bonus Eligible):**\n';
          summaryMessage += highCommandResults.map(result => 
            `${result.success ? '✅' : '❌'} ${result.user}`
          ).join('\n');
        }

        await interaction.editReply({
          content: summaryMessage
        });

        logCommand(interaction.user, 'dm_outstanding-all', 'SUCCESS', 
          `Sent DMs to ${dmResults.length} members with outstanding, ${highCommandResults.length} high command members`);
      } catch (error) {
        logCommand(interaction.user, 'dm_outstanding-all', 'FAIL', error.message);
        await interaction.editReply({
          content: '❌ Failed to process outstanding bonus DMs'
        });
      }
      return;
    }

    if (interaction.commandName === 'dm_all-achievements') {
      logCommand(interaction.user, 'dm_all-achievements', 'START');

      await interaction.deferReply({ ephemeral: true });

      try {
        const allAchievements = await achievementsCollection.find().toArray();
        
        if (allAchievements.length === 0) {
          logCommand(interaction.user, 'dm_all-achievements', 'DEBUG', 'No achievements data');
          return interaction.editReply({
            content: 'ℹ️ No achievements data available yet'
          });
        }

        const dmResults = [];

        for (const userAchievements of allAchievements) {
          try {
            const member = await interaction.guild.members.fetch(userAchievements.userId);
            
            const embed = new EmbedBuilder()
              .setColor(0xFFD700)
              .setTitle('🏆 Your Achievements')
              .setDescription('Here are your earned achievements in Slayers Family')
              .setThumbnail(member.user.displayAvatarURL());
              
            if (userAchievements.achievements.length > 0) {
              userAchievements.achievements.forEach((achievement, index) => {
                embed.addFields({
                  name: `${index + 1}. ${achievement.name}`,
                  value: `Earned on: ${new Date(achievement.date).toLocaleDateString()}\n${achievement.description}`,
                  inline: false
                });
              });
            } else {
              embed.setDescription('You haven\'t earned any achievements yet. Keep participating in events!');
            }
            
            embed.setFooter({ text: 'Slayers Family - Earn more by being active!' });

            const dmResult = await sendDM(member.user, embed);
            dmResults.push({
              user: member.displayName || member.user.username,
              success: dmResult.success,
              error: dmResult.error
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error processing member ${userAchievements.userId}:`, error);
            dmResults.push({
              user: `Unknown (${userAchievements.userId})`,
              success: false,
              error: error.message
            });
          }
        }

        let summaryMessage = '📊 Achievements DM Summary:\n\n';
        summaryMessage += dmResults.map(result => 
          `${result.success ? '✅' : '❌'} ${result.user}`
        ).join('\n');

        await interaction.editReply({
          content: summaryMessage
        });

        logCommand(interaction.user, 'dm_all-achievements', 'SUCCESS', 
          `Sent DMs to ${dmResults.length} members`);
      } catch (error) {
        logCommand(interaction.user, 'dm_all-achievements', 'FAIL', error.message);
        await interaction.editReply({
          content: '❌ Failed to process achievements DMs'
        });
      }
      return;
    }

    if (interaction.commandName === 'my_stats') {
      logCommand(interaction.user, 'my_stats', 'START');
      
      const user = interaction.user;
      const userBonus = await getUserBonus(user.id);
      const achievements = await getUserAchievements(user.id);
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`📊 ${user.username}'s Stats`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '💰 Total Bonus', value: `$${userBonus.total}`, inline: true },
          { name: '💳 Paid Bonus', value: `$${userBonus.paid}`, inline: true },
          { name: '💸 Outstanding', value: `$${Math.max(0, userBonus.total - userBonus.paid)}`, inline: true },
          { name: '🏆 Achievements', value: `${achievements.achievements.length} earned`, inline: true },
          { name: '📅 Member Since', value: `<t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:D>`, inline: true }
        )
        .setFooter({ text: 'Slayers Family - Your contribution matters!' });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      logCommand(interaction.user, 'my_stats', 'SUCCESS');
      return;
    }

    if (interaction.commandName === 'my_bonus') {
      logCommand(interaction.user, 'my_bonus', 'START');
      
      const user = interaction.user;
      const userBonus = await getUserBonus(user.id);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`💰 ${user.username}'s Bonus Summary`)
        .setDescription('Here is your current bonus status')
        .addFields(
          { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
          { name: '💳 Paid Bonus', value: `$${userBonus.paid}`, inline: true },
          { name: '💸 Outstanding', value: `$${Math.max(0, userBonus.total - userBonus.paid)}`, inline: true }
        );
        
      if (userBonus.history.length > 0) {
        const recentHistory = userBonus.history.slice(-5).reverse().map(entry => {
          const date = new Date(entry.date).toLocaleDateString();
          return `**${entry.type.toUpperCase()}** $${entry.amount} on ${date}`;
        }).join('\n');
        
        embed.addFields({ name: '📜 Recent Activity', value: recentHistory });
      }
      
      embed.setFooter({ text: 'Slayers Family Bonus System' });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      logCommand(interaction.user, 'my_bonus', 'SUCCESS');
      return;
    }

    if (interaction.commandName === 'my_achievements') {
      logCommand(interaction.user, 'my_achievements', 'START');
      
      const user = interaction.user;
      const achievements = await getUserAchievements(user.id);
      
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`🏆 ${user.username}'s Achievements`)
        .setThumbnail(user.displayAvatarURL());
        
      if (achievements.achievements.length > 0) {
        embed.setDescription('Here are your earned achievements:');
        achievements.achievements.forEach((achievement, index) => {
          embed.addFields({
            name: `${index + 1}. ${achievement.name}`,
            value: `Earned on: ${new Date(achievement.date).toLocaleDateString()}\n${achievement.description}`,
            inline: false
          });
        });
      } else {
        embed.setDescription('You haven\'t earned any achievements yet. Keep participating in events!');
      }
      
      embed.setFooter({ text: 'Slayers Family - Earn more by being active!' });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      logCommand(interaction.user, 'my_achievements', 'SUCCESS');
      return;
    }

  } catch (error) {
    logCommand(interaction.user, interaction.commandName, 'FAIL', error.message);
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
    const eventValue = interaction.values[0];
    const eventName = EVENT_NAMES.find(e => e.value === eventValue)?.name || eventValue;
    
    logCommand(interaction.user, 'attendance [select]', 'SUCCESS', `Selected: ${eventName}`);

    await interaction.editReply({
      content: `✅ Selected: **${eventName}**\n\n💰 Please enter the bonus amount for this event (enter 0 if no bonus):`,
      components: []
    });

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
          logCommand(interaction.user, 'attendance [amount]', 'WARN', 'Invalid amount format');
          const reply = await amountMessage.reply({
            content: '❌ Please enter a valid number for the bonus amount',
            allowedMentions: { parse: [] }
          });
          setTimeout(() => reply.delete(), 5000);
          await amountMessage.delete().catch(() => {});
          return;
        }

        if (bonusAmount < 0) {
          logCommand(interaction.user, 'attendance [amount]', 'WARN', 'Negative amount');
          const reply = await amountMessage.reply({
            content: '❌ Bonus amount cannot be negative',
            allowedMentions: { parse: [] }
          });
          setTimeout(() => reply.delete(), 5000);
          await amountMessage.delete().catch(() => {});
          return;
        }

        logCommand(interaction.user, 'attendance [amount]', 'SUCCESS', `Bonus amount: $${bonusAmount}`);

        const dateSelect = new StringSelectMenuBuilder()
          .setCustomId('date-select')
          .setPlaceholder('Choose date option')
          .addOptions([
            { 
              label: `Today (${getTodayDate()})`, 
              value: 'today',
              emoji: '📅'
            },
            { 
              label: `Yesterday (${getYesterdayDate()})`, 
              value: 'yesterday',
              emoji: '🕰️'
            },
            { 
              label: `Tomorrow (${getTomorrowDate()})`, 
              value: 'tomorrow',
              emoji: '⏭️'
            },
            { 
              label: 'Custom date', 
              value: 'custom',
              emoji: '✏️'
            }
          ]);

        const row = new ActionRowBuilder().addComponents(dateSelect);
        
        await interaction.editReply({
          content: `✅ Event: **${eventName}**\n💰 Bonus: **$${bonusAmount}**\n\n📅 Choose date option:`,
          components: [row]
        });

        await amountMessage.delete().catch(() => {});
      } catch (error) {
        logCommand(interaction.user, 'attendance [amount]', 'FAIL', error.message);
      }
    });
  } catch (error) {
    logCommand(interaction.user, 'attendance [select]', 'FAIL', error.message);
  }
});

// Date selection handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'date-select') return;

  try {
    await interaction.deferUpdate();
    const dateOption = interaction.values[0];
    const eventMatch = interaction.message.content.match(/\*\*(.*?)\*\*\n💰 Bonus: \*\*\$(.*?)\*\*/);
    
    if (!eventMatch) return;
    
    const eventName = eventMatch[1];
    const eventBonus = parseInt(eventMatch[2]);
    
    if (dateOption === 'today') {
      const today = getTodayDate();
      await handleDateSelection(interaction, eventName, eventBonus, today, "today");
    } 
    else if (dateOption === 'yesterday') {
      const yesterday = getYesterdayDate();
      await handleDateSelection(interaction, eventName, eventBonus, yesterday, "yesterday");
    }
    else if (dateOption === 'tomorrow') {
      const tomorrow = getTomorrowDate();
      await handleDateSelection(interaction, eventName, eventBonus, tomorrow, "tomorrow");
    }
    else if (dateOption === 'custom') {
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n💰 Bonus: **$${eventBonus}**\n\n📅 Enter custom date (DD/MM/YYYY):`,
        components: []
      });

      const dateFilter = m => m.author.id === interaction.user.id;
      const dateCollector = interaction.channel.createMessageCollector({ 
        filter: dateFilter, 
        time: 60000,
        max: 1
      });

      dateCollector.on('collect', async dateMessage => {
        try {
          const dateInput = dateMessage.content.trim();
          const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
          
          if (!dateRegex.test(dateInput)) {
            logCommand(interaction.user, 'attendance [date]', 'WARN', 'Invalid date format');
            const reply = await dateMessage.reply({
              content: '❌ Invalid date format. Please use DD/MM/YYYY',
              allowedMentions: { parse: [] }
            });
            setTimeout(() => reply.delete(), 5000);
            await dateMessage.delete().catch(() => {});
            return;
          }

          logCommand(interaction.user, 'attendance [date]', 'SUCCESS', `Custom date: ${dateInput}`);

          await interaction.editReply({
            content: `✅ Event: **${eventName}**\n📅 Date: **${dateInput}**\n💰 Bonus: **$${eventBonus}**\n\n🔹 Mention participants: (@user1 @user2...)`,
            components: []
          });

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
                logCommand(interaction.user, 'attendance [mentions]', 'WARN', 'No users mentioned');
                const reply = await mentionMessage.reply({
                  content: '❌ Please mention at least one user',
                  allowedMentions: { parse: [] }
                });
                setTimeout(() => reply.delete(), 3000);
                return;
              }

              logCommand(interaction.user, 'attendance [mentions]', 'DEBUG', `${users.size} users mentioned`);
              await processAttendance(eventName, dateInput, users, mentionMessage, interaction.channel, eventBonus);
              await mentionMessage.delete().catch(() => {});
            } catch (error) {
              logCommand(interaction.user, 'attendance [process]', 'FAIL', error.message);
            }
          });

          await dateMessage.delete().catch(() => {});
        } catch (error) {
          logCommand(interaction.user, 'attendance [date]', 'FAIL', error.message);
        }
      });
    }
  } catch (error) {
    logCommand(interaction.user, 'attendance [date]', 'FAIL', error.message);
  }
});

async function handleDateSelection(interaction, eventName, eventBonus, date, dateLabel) {
  logCommand(interaction.user, 'attendance', 'SUCCESS', `Date: ${dateLabel} (${date})`);
  
  await interaction.editReply({
    content: `✅ Event: **${eventName}**\n📅 Date: **${date}** (${dateLabel})\n💰 Bonus: **$${eventBonus}**\n\n🔹 Mention participants: (@user1 @user2...)`,
    components: []
  });

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
        logCommand(interaction.user, 'attendance [mentions]', 'WARN', 'No users mentioned');
        const reply = await mentionMessage.reply({
          content: '❌ Please mention at least one user',
          allowedMentions: { parse: [] }
        });
        setTimeout(() => reply.delete(), 3000);
        return;
      }

      logCommand(interaction.user, 'attendance [mentions]', 'DEBUG', `${users.size} users mentioned`);
      await processAttendance(eventName, date, users, mentionMessage, interaction.channel, eventBonus);
      await mentionMessage.delete().catch(() => {});
    } catch (error) {
      logCommand(interaction.user, 'attendance [process]', 'FAIL', error.message);
    }
  });
}

// Process attendance function
async function processAttendance(eventName, date, users, sourceMessage, commandChannel, eventBonus) {
  try {
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

    let totalBonusAwarded = 0;
    let highCommandMembers = [];
    const dmResults = [];

    for (const { user, nickname, username, tag, displayName, isHighCommand } of memberInfo) {
      try {
        if (isHighCommand) {
          const highCmdDmEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎉 Event Attendance Recorded')
            .setDescription('Thank you for participating as High Command!')
            .addFields(
              { name: '📌 Event', value: `**${eventName}**`, inline: true },
              { name: '📅 Date', value: date, inline: true },
              { 
                name: '⚠️ Bonus Status', 
                value: 'As High Command, you are not eligible for event bonuses',
                inline: false
              },
              { 
                name: '📸 Upload Instructions', 
                value: `Submit your POV to: <#${CONFIG.POV_CHANNEL_ID}>\n\n` +
                       `**Required format:**\n\`\`\`\n"${eventName} | ${displayName}"\n"${date}"\n\`\`\``
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
                       `**Required format:**\n\`\`\`\n"${eventName} | ${displayName}"\n"${date}"\n\`\`\``
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
          const dmEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🎉 Event Attendance Recorded')
            .setDescription('Thank you for being part of the Slayers Family!')
            .addFields(
              { name: '📌 Event', value: `**${eventName}**`, inline: true },
              { name: '📅 Date', value: date, inline: true },
              { 
                name: '💰 Bonus Earned', 
                value: 'No bonus for this event',
                inline: false
              },
              { 
                name: '📝 Note', 
                value: 'If you performed any activity, your bonus will be added soon.\n' +
                       'If not received within 24 hours, please contact High Command.',
                inline: false
              },
              { 
                name: '📸 Upload Instructions', 
                value: `Submit your POV to: <#${CONFIG.POV_CHANNEL_ID}>\n\n` +
                       `**Required format:**\n\`\`\`\n"${eventName} | ${displayName}"\n"${date}"\n\`\`\``
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

    const dmStatus = dmResults.map(result => 
      `${result.success ? '✅' : '❌'} ${result.user}`
    ).join('\n');

    let highCommandStatus = '';
    if (highCommandMembers.length > 0) {
      highCommandStatus = `\n\n👑 High Command Members (no bonus awarded):\n${highCommandMembers.map(m => `${m.dmStatus} ${m.name}`).join('\n')}`;
    }

    const eligibleMembers = memberInfo.filter(({ isHighCommand }) => !isHighCommand);
    const outputContent = `**${eventName} - Attendance**\n**Date:** ${date}\n` +
      (eventBonus > 0 ? `**Bonus Awarded:** $${eventBonus} per participant\n**Total Bonus Awarded:** $${totalBonusAwarded}\n\n` : '**No Bonus Awarded for this event**\n\n') +
      `✅ Participants (${eligibleMembers.length}):\n` +
      eligibleMembers.map(({ user, displayName }) => 
        `• <@${user.id}> (${displayName})`
      ).join('\n') +
      highCommandStatus;

    await outputChannel.send({
      content: outputContent,
      allowedMentions: { users: Array.from(users.keys()) }
    });

    let replyMessage = `✅ Attendance recorded for ${users.size} users!\n` +
                       (eventBonus > 0 ? `💰 $${totalBonusAwarded} in bonuses awarded to ${eligibleMembers.length} eligible members\n` : '') +
                       `📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}> (${CONFIG.OUTPUT_CHANNEL_NAME})\n\n` +
                       `**DM Delivery Status:**\n${dmStatus}`;

    if (highCommandMembers.length > 0) {
      replyMessage += `\n\n👑 High Command Members (${highCommandMembers.length}):\n` +
                      highCommandMembers.map(m => `${m.dmStatus} ${m.name}`).join('\n');
    }

    await sourceMessage.reply({
      content: replyMessage,
      ephemeral: true
    });
    logCommand(sourceMessage.author, 'processAttendance', 'SUCCESS', 
      `Processed ${users.size} users (${eligibleMembers.length} eligible, ${highCommandMembers.length} high command)`);

  } catch (error) {
    logCommand(sourceMessage.author, 'processAttendance', 'FAIL', error.message);
    console.error(`[${new Date().toISOString()}] 🛑 Processing Error:`, error.stack);
    await sourceMessage.reply({
      content: '❌ An error occurred while processing attendance',
      ephemeral: true
    });
  }
}

// Login
client.login(CONFIG.DISCORD_TOKEN).catch(error => {
  console.error(`❌ Login failed: ${error.message}`);
  process.exit(1);
});