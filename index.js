require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');
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
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058'
};

// Event names
const EVENT_NAMES = Object.keys(EVENT_BONUS_CONFIG);

// Helper function to update bonus
async function updateBonus(userId, username, amount, type, reason) {
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
      transaction = { amount, type, reason };
      break;
    case 'deduct':
      bonus.totalBonus -= amount;
      bonus.outstanding -= amount;
      transaction = { amount: -amount, type, reason };
      break;
    case 'paid':
      if (amount > bonus.outstanding) {
        throw new Error('Amount exceeds outstanding bonus');
      }
      bonus.paid += amount;
      bonus.outstanding -= amount;
      transaction = { amount, type, reason };
      break;
    default:
      throw new Error('Invalid transaction type');
  }
  
  bonus.transactions.push(transaction);
  await bonus.save();
  return bonus;
}

// Bonus Commands
const bonusCommands = {
  addbonus: {
    data: new SlashCommandBuilder()
      .setName('addbonus')
      .setDescription('Add bonus to a user')
      .addUserOption(option => 
        option.setName('user')
          .setDescription('User to add bonus to')
          .setRequired(true))
      .addIntegerOption(option => 
        option.setName('amount')
          .setDescription('Amount to add')
          .setRequired(true))
      .addStringOption(option => 
        option.setName('reason')
          .setDescription('Reason for adding bonus')
          .setRequired(false)),
    async execute(interaction) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
      }
      
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      try {
        await updateBonus(user.id, user.username, amount, 'add', reason);
        await interaction.reply({ 
          content: `✅ Added $${amount} bonus to ${user.username} for: ${reason}`,
          ephemeral: true 
        });
      } catch (error) {
        console.error('Add Bonus Error:', error);
        await interaction.reply({ 
          content: `❌ Failed to add bonus: ${error.message}`,
          ephemeral: true 
        });
      }
    }
  },
  lessbonus: {
    data: new SlashCommandBuilder()
      .setName('lessbonus')
      .setDescription('Deduct bonus from a user')
      .addUserOption(option => 
        option.setName('user')
          .setDescription('User to deduct bonus from')
          .setRequired(true))
      .addIntegerOption(option => 
        option.setName('amount')
          .setDescription('Amount to deduct')
          .setRequired(true))
      .addStringOption(option => 
        option.setName('reason')
          .setDescription('Reason for deduction')
          .setRequired(false)),
    async execute(interaction) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
      }
      
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      try {
        await updateBonus(user.id, user.username, amount, 'deduct', reason);
        await interaction.reply({ 
          content: `✅ Deducted $${amount} from ${user.username} for: ${reason}`,
          ephemeral: true 
        });
      } catch (error) {
        console.error('Less Bonus Error:', error);
        await interaction.reply({ 
          content: `❌ Failed to deduct bonus: ${error.message}`,
          ephemeral: true 
        });
      }
    }
  },
  bonuspaid: {
    data: new SlashCommandBuilder()
      .setName('bonuspaid')
      .setDescription('Mark bonus as paid')
      .addUserOption(option => 
        option.setName('user')
          .setDescription('User who received payment')
          .setRequired(true))
      .addIntegerOption(option => 
        option.setName('amount')
          .setDescription('Amount paid')
          .setRequired(true))
      .addStringOption(option => 
        option.setName('reason')
          .setDescription('Payment reason')
          .setRequired(false)),
    async execute(interaction) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
      }
      
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      try {
        const bonus = await updateBonus(user.id, user.username, amount, 'paid', reason);
        
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('💰 Bonus Payment Received')
            .setDescription(`You have received a payment of $${amount} for your bonus.`)
            .addFields(
              { name: 'Total Bonus', value: `$${bonus.totalBonus}`, inline: true },
              { name: 'Paid', value: `$${bonus.paid}`, inline: true },
              { name: 'Outstanding', value: `$${bonus.outstanding}`, inline: true },
              { name: 'Reason', value: reason }
            );
          
          await user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`Failed to send DM to ${user.username}:`, dmError);
        }
        
        await interaction.reply({ 
          content: `✅ Marked $${amount} as paid for ${user.username}`,
          ephemeral: true 
        });
      } catch (error) {
        console.error('Bonus Paid Error:', error);
        await interaction.reply({ 
          content: `❌ Failed to mark bonus as paid: ${error.message}`,
          ephemeral: true 
        });
      }
    }
  },
  listbonus: {
    data: new SlashCommandBuilder()
      .setName('listbonus')
      .setDescription('List all bonus records'),
    async execute(interaction) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
      }
      
      try {
        const bonuses = await Bonus.find().sort({ outstanding: -1, username: 1 });
        
        if (bonuses.length === 0) {
          return interaction.reply({ content: 'No bonus records found.', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('💰 Bonus Summary')
          .setDescription('Total bonus records for all users');
        
        bonuses.forEach(bonus => {
          embed.addFields({
            name: bonus.username,
            value: `Total: $${bonus.totalBonus}\nPaid: $${bonus.paid}\nOutstanding: $${bonus.outstanding}`,
            inline: true
          });
        });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('List Bonus Error:', error);
        await interaction.reply({ 
          content: '❌ Failed to retrieve bonus records',
          ephemeral: true 
        });
      }
    }
  },
  bonushelp: {
    data: new SlashCommandBuilder()
      .setName('bonushelp')
      .setDescription('Show bonus commands help'),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🆘 Bonus Commands Help')
        .setDescription('Commands to manage the bonus system')
        .addFields(
          { name: '/addbonus', value: 'Add bonus to a user\nUsage: /addbonus @user amount [reason]' },
          { name: '/lessbonus', value: 'Deduct bonus from a user\nUsage: /lessbonus @user amount [reason]' },
          { name: '/bonuspaid', value: 'Mark bonus as paid\nUsage: /bonuspaid @user amount [reason]' },
          { name: '/listbonus', value: 'List all bonus records' }
        );
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
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

// Discord events
client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  console.log(`👑 Admin Roles: ${CONFIG.ADMIN_ROLE_IDS.join(', ')}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    // Handle bonus commands
    for (const [name, command] of Object.entries(bonusCommands)) {
      if (interaction.commandName === name) {
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
            await updateBonus(user.id, user.username, eventBonus, 'add', `Event: ${eventName}`);
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
