require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

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

// Bonus Schema
const bonusSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },
  paid: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  eventName: String,
  kills: { type: Number, default: 0 },
  parachutes: { type: Number, default: 0 }
});

const Bonus = mongoose.model('Bonus', bonusSchema);

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

// Bonus rules
const BONUS_RULES = {
  "Family raid (Attack)": { type: 'fixed', amount: 15000 },
  "Family raid (Protection)": { type: 'fixed', amount: 5000 },
  "State Object": { type: 'fixed', amount: 8000 },
  "Turf": { type: 'fixed', amount: 0 },
  "Store robbery": { type: 'fixed', amount: 15000 },
  "Caravan delivery": { type: 'fixed', amount: 0 },
  "Attacking Prison": { type: 'fixed', amount: 10000 },
  "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)": { type: 'parachute', amount: 25000 },
  "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪": { type: 'kill', amount: 25000 },
  "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: 'fixed', amount: 8000 },
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤": { type: 'fixed', amount: 300000 },
  "𝔽𝕠𝕦𝕟𝕕𝕣𝕪": { type: 'kill', amount: 20000 },
  "𝕄𝕒𝕝𝕝": { type: 'fixed', amount: 75000 },
  "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣": { type: 'kill', amount: 80000 },
  "𝕍𝕚𝕟𝕖𝕪�𝕣𝕕": { type: 'fixed', amount: 20000 },
  "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)": { type: 'fixed', amount: 10000 },
  "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'fixed', amount: 0 },
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤": { type: 'fixed', amount: 0 },
  "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖": { type: 'kill', amount: 20000 },
  "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'parachute', amount: 50000 },
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪": { type: 'fixed', amount: 35000 },
  "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣": { type: 'kill', amount: 20000 },
  "Family War": { type: 'fixed', amount: 0 },
  "Money Printing Machine": { type: 'fixed', amount: 0 },
  "Informal (Battle for business for unofficial organization)": { type: 'kill', amount: 50000 }
};

// Ineligible roles (founder, co-founder, high command)
const INELIGIBLE_ROLES = ['1398888612388540538', '1398888612388540537', '1398888612388540536'];

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

// Bonus functions
async function calculateBonus(eventName, userId, guild, kills = 0, parachutes = 0) {
  const eventRule = BONUS_RULES[eventName];
  if (!eventRule) return 0;

  // Check if user has ineligible role
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return 0;

  const hasIneligibleRole = member.roles.cache.some(role => 
    INELIGIBLE_ROLES.includes(role.id)
  );
  if (hasIneligibleRole) return 0;

  // Calculate bonus based on type
  switch (eventRule.type) {
    case 'fixed':
      return eventRule.amount;
    case 'kill':
      return kills * eventRule.amount;
    case 'parachute':
      return parachutes * eventRule.amount;
    default:
      return 0;
  }
}

async function getUserBonusSummary(userId) {
  const bonuses = await Bonus.find({ userId }).sort({ date: -1 });
  
  let total = 0;
  let paid = 0;
  let outstanding = 0;
  
  bonuses.forEach(bonus => {
    total += bonus.amount;
    if (bonus.paid) {
      paid += bonus.amount;
    } else {
      outstanding += bonus.amount;
    }
  });
  
  return { total, paid, outstanding, bonuses };
}

async function getAllBonuses() {
  const bonuses = await Bonus.aggregate([
    {
      $group: {
        _id: "$userId",
        username: { $first: "$username" },
        total: { $sum: "$amount" },
        paid: { $sum: { $cond: [{ $eq: ["$paid", true] }, "$amount", 0] } },
        outstanding: { $sum: { $cond: [{ $eq: ["$paid", false] }, "$amount", 0] } }
      }
    },
    { $sort: { outstanding: -1 } }
  ]);
  
  return bonuses;
}

async function sendBonusDM(user, eventName, date, bonusAmount, previousSummary) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('💰 Event Bonus Information')
      .setDescription('Here are your bonus details:')
      .addFields(
        { name: '📌 Event', value: eventName, inline: true },
        { name: '📅 Date', value: date, inline: true },
        { name: '💸 Bonus Earned', value: `$${bonusAmount.toLocaleString()}`, inline: true },
        { name: '💰 Total Bonus', value: `$${previousSummary.total.toLocaleString()}`, inline: true },
        { name: '💳 Paid', value: `$${previousSummary.paid.toLocaleString()}`, inline: true },
        { name: '🔄 Outstanding', value: `$${previousSummary.outstanding.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: 'Thank you for participating in family events!' });
    
    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`Failed to send DM to ${user.username}:`, error);
    return false;
  }
}

async function addBonus(userId, username, amount, reason, paid = false, eventName = null, kills = 0, parachutes = 0) {
  const bonus = new Bonus({
    userId,
    username,
    amount,
    reason,
    paid,
    date: new Date(),
    eventName,
    kills,
    parachutes
  });
  
  await bonus.save();
  return bonus;
}

async function markAsPaid(userId, amount) {
  // Find outstanding bonuses (oldest first)
  const outstanding = await Bonus.find({ 
    userId, 
    paid: false 
  }).sort({ date: 1 });
  
  let remaining = amount;
  const updatedBonuses = [];
  
  for (const bonus of outstanding) {
    if (remaining <= 0) break;
    
    const toPay = Math.min(bonus.amount, remaining);
    if (toPay === bonus.amount) {
      // Mark entire bonus as paid
      bonus.paid = true;
      await bonus.save();
      updatedBonuses.push(bonus);
      remaining -= toPay;
    } else {
      // Split the bonus
      const newBonus = new Bonus({
        userId: bonus.userId,
        username: bonus.username,
        amount: bonus.amount - toPay,
        reason: bonus.reason,
        paid: false,
        date: bonus.date,
        eventName: bonus.eventName,
        kills: bonus.kills,
        parachutes: bonus.parachutes
      });
      
      bonus.amount = toPay;
      bonus.paid = true;
      
      await Promise.all([bonus.save(), newBonus.save()]);
      updatedBonuses.push(bonus);
      remaining -= toPay;
    }
  }
  
  return { updatedBonuses, remaining };
}

// Discord events
client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
});

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

    if (interaction.commandName === 'addbonus') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Manual bonus addition';

      await addBonus(user.id, user.username, amount, reason);
      await interaction.reply({
        content: `✅ Added $${amount.toLocaleString()} bonus to ${user.username} for: ${reason}`,
        ephemeral: true
      });
    }

    if (interaction.commandName === 'lessbonus') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Manual bonus deduction';

      await addBonus(user.id, user.username, -amount, reason);
      await interaction.reply({
        content: `✅ Deducted $${amount.toLocaleString()} from ${user.username}'s bonus for: ${reason}`,
        ephemeral: true
      });
    }

    if (interaction.commandName === 'bonuspaid') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Bonus payment';

      const { updatedBonuses, remaining } = await markAsPaid(user.id, amount);
      
      if (updatedBonuses.length === 0) {
        return interaction.reply({
          content: `❌ ${user.username} has no outstanding bonuses.`,
          ephemeral: true
        });
      }

      const paidAmount = amount - remaining;
      const summary = await getUserBonusSummary(user.id);

      try {
        const dmSent = await sendBonusDM(user, 'Bonus Payment', new Date().toLocaleDateString(), paidAmount, summary);
        
        await interaction.reply({
          content: `✅ Paid $${paidAmount.toLocaleString()} to ${user.username}. ${remaining > 0 ? `$${remaining} remains unallocated.` : 'All allocated.'}${dmSent ? '' : ' (Failed to send DM)'}`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Payment Error:', error);
        await interaction.reply({
          content: '❌ An error occurred during payment processing',
          ephemeral: true
        });
      }
    }

    if (interaction.commandName === 'listbonus') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      const allBonuses = await getAllBonuses();
      
      if (allBonuses.length === 0) {
        return interaction.reply({
          content: 'No bonus records found.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('💰 Family Bonus Summary')
        .setDescription('Total bonuses for all members:')
        .setTimestamp();

      // Split into multiple embeds if too many users
      const chunks = [];
      for (let i = 0; i < allBonuses.length; i += 10) {
        chunks.push(allBonuses.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const fields = chunk.map(user => ({
          name: user.username,
          value: `Total: $${user.total.toLocaleString()}\nPaid: $${user.paid.toLocaleString()}\nOutstanding: $${user.outstanding.toLocaleString()}`,
          inline: true
        }));
        
        const chunkEmbed = new EmbedBuilder(embed.toJSON());
        chunkEmbed.addFields(fields);
        
        await interaction.channel.send({ embeds: [chunkEmbed] });
      }

      await interaction.reply({
        content: '✅ Bonus summary sent to channel',
        ephemeral: true
      });
    }

    if (interaction.commandName === 'outstanding_bonus_dm') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      const allBonuses = await getAllBonuses();
      const usersWithOutstanding = allBonuses.filter(user => user.outstanding > 0);
      
      let successCount = 0;
      let failCount = 0;

      for (const user of usersWithOutstanding) {
        try {
          const member = await interaction.guild.members.fetch(user._id);
          const summary = await getUserBonusSummary(user._id);
          const sent = await sendBonusDM(member.user, 'Bonus Summary', new Date().toLocaleDateString(), 0, summary);
          if (sent) successCount++;
          else failCount++;
        } catch (error) {
          console.error(`Failed to send DM to ${user.username}:`, error);
          failCount++;
        }
      }

      await interaction.reply({
        content: `✅ Sent DMs to ${successCount} members. Failed to send to ${failCount} members.`,
        ephemeral: true
      });
    }

    if (interaction.commandName === 'kills') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      const users = interaction.options.getString('users');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');
      const count = interaction.options.getInteger('count');

      // Validate event
      const eventRule = BONUS_RULES[eventName];
      if (!eventRule || eventRule.type !== 'kill') {
        return interaction.reply({
          content: `❌ Invalid event for kills. Must be one of: ${Object.entries(BONUS_RULES)
            .filter(([_, rule]) => rule.type === 'kill')
            .map(([name]) => name)
            .join(', ')}`,
          ephemeral: true
        });
      }

      // Process each user
      const userMentions = users.match(/<@!?(\d+)>/g) || [];
      const userIds = userMentions.map(mention => mention.replace(/<@!?(\d+)>/, '$1'));

      for (const userId of userIds) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
          await addBonus(
            userId,
            member.user.username,
            count * eventRule.amount,
            `Kills in ${eventName}`,
            false,
            eventName,
            count,
            0
          );
        }
      }

      await interaction.reply({
        content: `✅ Recorded ${count} kills in ${eventName} for ${userIds.length} members.`,
        ephemeral: true
      });
    }

    if (interaction.commandName === 'parachute') {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      const users = interaction.options.getString('users');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');
      const count = interaction.options.getInteger('count');

      // Validate event
      const eventRule = BONUS_RULES[eventName];
      if (!eventRule || eventRule.type !== 'parachute') {
        return interaction.reply({
          content: `❌ Invalid event for parachutes. Must be one of: ${Object.entries(BONUS_RULES)
            .filter(([_, rule]) => rule.type === 'parachute')
            .map(([name]) => name)
            .join(', ')}`,
          ephemeral: true
        });
      }

      // Process each user
      const userMentions = users.match(/<@!?(\d+)>/g) || [];
      const userIds = userMentions.map(mention => mention.replace(/<@!?(\d+)>/, '$1'));

      for (const userId of userIds) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
          await addBonus(
            userId,
            member.user.username,
            count * eventRule.amount,
            `Parachutes in ${eventName}`,
            false,
            eventName,
            0,
            count
          );
        }
      }

      await interaction.reply({
        content: `✅ Recorded ${count} parachutes in ${eventName} for ${userIds.length} members.`,
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
        // Save to MongoDB
        const attendanceRecord = new Attendance({
          eventName,
          date,
          userId: user.id,
          username: user.username
        });
        await attendanceRecord.save();

        // Calculate bonus
        const bonusAmount = await calculateBonus(eventName, user.id, sourceMessage.guild);
        let bonusRecord = null;
        
        if (bonusAmount > 0) {
          bonusRecord = await addBonus(
            user.id,
            user.username,
            bonusAmount,
            `Attendance for ${eventName}`,
            false,
            eventName,
            0,
            0
          );
        }

        // Get bonus summary for DM
        const bonusSummary = await getUserBonusSummary(user.id);

        // Send DM
        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for participating!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true },
            { name: '💰 Bonus Earned', value: `$${bonusAmount.toLocaleString()}`, inline: true },
            { name: '📸 POV Submission', value: `Submit to: <#${CONFIG.POV_CHANNEL_ID}>\n\nFormat:\n\`\`\`\n"${eventName} | @${user.username}"\n"${date}"\n\`\`\`` }
          );

        if (bonusAmount > 0) {
          dmEmbed.addFields(
            { name: '💵 Total Bonus', value: `$${bonusSummary.total.toLocaleString()}`, inline: true },
            { name: '💳 Paid', value: `$${bonusSummary.paid.toLocaleString()}`, inline: true },
            { name: '🔄 Outstanding', value: `$${bonusSummary.outstanding.toLocaleString()}`, inline: true }
          );
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
