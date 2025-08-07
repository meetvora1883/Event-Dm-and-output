require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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

// Schemas
const attendanceSchema = new mongoose.Schema({
  eventName: String,
  date: String,
  userId: String,
  username: String,
  timestamp: { type: Date, default: Date.now }
}, { autoIndex: false });

const bonusSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: false },
  username: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  paid: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  eventName: String,
  kills: { type: Number, default: 0 },
  parachutes: { type: Number, default: 0 }
}, { autoIndex: false });

const Attendance = mongoose.model('Attendance', attendanceSchema);
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

// Event names and bonus rules (same as before)
const EVENT_NAMES = [/* your event names array */];
const BONUS_RULES = { /* your bonus rules object */ };
const INELIGIBLE_ROLES = ['1398888612388540538', '1398888612388540537', '1398888612388540536'];

// Express setup (same as before)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    bot: client.readyAt ? 'connected' : 'connecting',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

app.listen(PORT, () => console.log(`🖥️ Server running on port ${PORT}`));

setInterval(async () => {
  try {
    await axios.get(`http://localhost:${PORT}/api/status`);
    console.log('♻️ Keepalive ping successful');
  } catch (err) {
    console.warn('⚠️ Keepalive ping failed:', err.message);
  }
}, 300000);

// Utility functions (same as before)
function getTomorrowDate() { /* ... */ }
function formatDate(date) { /* ... */ }
function isValidDate(dateString) { /* ... */ }

// Bonus functions (same as before)
async function calculateBonus() { /* ... */ }
async function getUserBonusSummary() { /* ... */ }
async function getAllBonuses() { /* ... */ }
async function sendBonusDM() { /* ... */ }
async function addBonus() { /* ... */ }
async function markAsPaid() { /* ... */ }

// ==================== COMMAND HANDLERS ====================

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    // Help Command
    if (interaction.commandName === 'help') {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Bot Help')
        .setDescription('Available commands:')
        .addFields(
          { name: '/attendance', value: 'Record event attendance' },
          { name: '/addbonus', value: 'Add bonus to member' },
          { name: '/lessbonus', value: 'Deduct bonus from member' },
          { name: '/bonuspaid', value: 'Mark bonus as paid' },
          { name: '/listbonus', value: 'List all bonuses' },
          { name: '/outstanding_bonus_dm', value: 'Send DMs with outstanding bonuses' },
          { name: '/kills', value: 'Record kills for kill-based events' },
          { name: '/parachute', value: 'Record parachutes for parachute events' }
        );
      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      return;
    }

    // Check admin permissions for admin commands
    const isAdmin = CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));
    if (!isAdmin && [
      'attendance', 'addbonus', 'lessbonus', 'bonuspaid', 
      'listbonus', 'outstanding_bonus_dm', 'kills', 'parachute'
    ].includes(interaction.commandName)) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    // Attendance Command
    if (interaction.commandName === 'attendance') {
      const eventSelect = new StringSelectMenuBuilder()
        .setCustomId('event-select')
        .setPlaceholder('Choose event')
        .addOptions(EVENT_NAMES.map(event => ({
          label: event.length > 25 ? `${event.substring(0, 22)}...` : event,
          value: event
        })));

      const row = new ActionRowBuilder().addComponents(eventSelect);
      await interaction.reply({ content: '📋 Select an event:', components: [row], ephemeral: true });
      return;
    }

    // Add Bonus Command
    if (interaction.commandName === 'addbonus') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Manual addition';

      await addBonus(user.id, user.username, amount, reason);
      await interaction.reply({
        content: `✅ Added $${amount.toLocaleString()} bonus to ${user.username} for: ${reason}`,
        ephemeral: true
      });
      return;
    }

    // Less Bonus Command
    if (interaction.commandName === 'lessbonus') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Manual deduction';

      await addBonus(user.id, user.username, -amount, reason);
      await interaction.reply({
        content: `✅ Deducted $${amount.toLocaleString()} from ${user.username}'s bonus for: ${reason}`,
        ephemeral: true
      });
      return;
    }

    // Bonus Paid Command
    if (interaction.commandName === 'bonuspaid') {
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

      const dmSent = await sendBonusDM(user, 'Bonus Payment', new Date().toLocaleDateString(), paidAmount, summary);
      
      await interaction.reply({
        content: `✅ Paid $${paidAmount.toLocaleString()} to ${user.username}. ${remaining > 0 ? `$${remaining} remains.` : ''}${dmSent ? '' : ' (DM failed)'}`,
        ephemeral: true
      });
      return;
    }

    // List Bonus Command
    if (interaction.commandName === 'listbonus') {
      const allBonuses = await getAllBonuses();
      
      if (allBonuses.length === 0) {
        return interaction.reply({ content: 'No bonus records found.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('💰 Family Bonus Summary')
        .setDescription('Total bonuses for all members:')
        .setTimestamp();

      // Split into chunks of 10 users per embed
      for (let i = 0; i < allBonuses.length; i += 10) {
        const chunk = allBonuses.slice(i, i + 10);
        const fields = chunk.map(user => ({
          name: user.username,
          value: `Total: $${user.total.toLocaleString()}\nPaid: $${user.paid.toLocaleString()}\nOutstanding: $${user.outstanding.toLocaleString()}`,
          inline: true
        }));
        
        const chunkEmbed = new EmbedBuilder(embed.toJSON());
        chunkEmbed.addFields(fields);
        
        await interaction.channel.send({ embeds: [chunkEmbed] });
      }

      await interaction.reply({ content: '✅ Bonus summary sent to channel', ephemeral: true });
      return;
    }

    // Outstanding Bonus DM Command
    if (interaction.commandName === 'outstanding_bonus_dm') {
      const allBonuses = await getAllBonuses();
      const usersWithOutstanding = allBonuses.filter(user => user.outstanding > 0);
      
      let successCount = 0;
      let failCount = 0;

      for (const user of usersWithOutstanding) {
        try {
          const member = await interaction.guild.members.fetch(user._id);
          const summary = await getUserBonusSummary(user._id);
          const sent = await sendBonusDM(member.user, 'Bonus Summary', new Date().toLocaleDateString(), 0, summary);
          sent ? successCount++ : failCount++;
        } catch (error) {
          console.error(`Failed to send DM to ${user.username}:`, error);
          failCount++;
        }
      }

      await interaction.reply({
        content: `✅ Sent DMs to ${successCount} members. Failed: ${failCount}`,
        ephemeral: true
      });
      return;
    }

    // Kills Command
    if (interaction.commandName === 'kills') {
      const users = interaction.options.getString('users');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');
      const count = interaction.options.getInteger('count');

      const eventRule = BONUS_RULES[eventName];
      if (!eventRule || eventRule.type !== 'kill') {
        return interaction.reply({
          content: `❌ Invalid event for kills. Valid events: ${Object.entries(BONUS_RULES)
            .filter(([_, rule]) => rule.type === 'kill')
            .map(([name]) => name)
            .join(', ')}`,
          ephemeral: true
        });
      }

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
      return;
    }

    // Parachute Command
    if (interaction.commandName === 'parachute') {
      const users = interaction.options.getString('users');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');
      const count = interaction.options.getInteger('count');

      const eventRule = BONUS_RULES[eventName];
      if (!eventRule || eventRule.type !== 'parachute') {
        return interaction.reply({
          content: `❌ Invalid event for parachutes. Valid events: ${Object.entries(BONUS_RULES)
            .filter(([_, rule]) => rule.type === 'parachute')
            .map(([name]) => name)
            .join(', ')}`,
          ephemeral: true
        });
      }

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
      await interaction.reply({ content: '❌ Command failed unexpectedly', ephemeral: true });
    } else {
      await interaction.followUp({ content: '❌ An error occurred during command execution', ephemeral: true });
    }
  }
});

// ==================== SELECT MENU HANDLERS ====================

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  try {
    // Event Selection Handler
    if (interaction.customId === 'event-select') {
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

    // Date Selection Handler
    if (interaction.customId === 'date-select') {
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
    }
  } catch (error) {
    console.error('Select Menu Error:', error);
    await interaction.followUp({ content: '❌ Failed to process selection', ephemeral: true });
  }
});

// ==================== HELPER FUNCTIONS ====================

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
      interaction.followUp({ content: '❌ Failed to process mentions', ephemeral: true });
    }
  });

  mentionCollector.on('end', collected => {
    if (collected.size === 0) {
      interaction.followUp({ content: '❌ Timed out waiting for mentions', ephemeral: true });
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
      interaction.followUp({ content: '❌ Failed to process date', ephemeral: true });
    }
  });

  dateCollector.on('end', collected => {
    if (collected.size === 0) {
      interaction.followUp({ content: '❌ Timed out waiting for date', ephemeral: true });
    }
  });
}

async function processAttendance(eventName, date, users, sourceMessage, commandChannel) {
  try {
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    if (!outputChannel) throw new Error('Output channel not found');

    const savePromises = Array.from(users.values()).map(async user => {
      try {
        const attendanceRecord = new Attendance({ eventName, date, userId: user.id, username: user.username });
        await attendanceRecord.save();

        const bonusAmount = await calculateBonus(eventName, user.id, sourceMessage.guild);
        if (bonusAmount > 0) {
          await addBonus(user.id, user.username, bonusAmount, `Attendance for ${eventName}`, false, eventName);
        }

        const bonusSummary = await getUserBonusSummary(user.id);
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

// Error handling and startup (same as before)
process.on('unhandledRejection', error => console.error('⚠️ Unhandled rejection:', error));
process.on('uncaughtException', error => console.error('⚠️ Uncaught exception:', error));
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  client.destroy();
  mongoose.disconnect();
  process.exit(0);
});

client.login(CONFIG.DISCORD_TOKEN).catch(error => {
  console.error('❌ Failed to login:', error);
  process.exit(1);
});