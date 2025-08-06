require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Bonus = require('./models/Bonus');
const Attendance = require('./models/Attendance');
const { EVENT_BONUS_CONFIG, EVENT_NAMES, INELIGIBLE_ROLES } = require('./config');
const { getTomorrowDate, formatDate, isValidDate } = require('./helpers');

// Initialize
const app = express();
const PORT = process.env.PORT || 10000;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Config
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || ['1398888612388540538', '1398888612388540537'],
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058'
};

// Import commands
const attendanceCommand = require('./commands/attendance');
const bonusCommands = require('./commands/bonus');

// Command collection
const commands = {
  attendance: attendanceCommand,
  ...bonusCommands
};

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://meetvora1883:meetvora1883@discordbot.xkgfuaj.mongodb.net/?retryWrites=true&w=majority')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Client ready
client.on('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  
  // Register commands
  try {
    const commandData = Object.values(commands).map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: commandData });
    console.log('✅ Commands registered');
  } catch (error) {
    console.error('❌ Command registration failed:', error);
  }

  client.user.setActivity('Slayers Family', { type: 'WATCHING' });
});

// Interactions
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isCommand()) {
      const command = commands[interaction.commandName];
      if (command) await command.execute(interaction, { 
        client, 
        CONFIG,
        Bonus,
        Attendance,
        EVENT_BONUS_CONFIG,
        EVENT_NAMES,
        INELIGIBLE_ROLES,
        helpers: { getTomorrowDate, formatDate, isValidDate }
      });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'attendance-event-select') {
        await attendanceCommand.handleEventSelect(interaction, { client, EVENT_BONUS_CONFIG });
      }
      // Add other select handlers
    }
  } catch (error) {
    console.error('Interaction error:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ An error occurred', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ An error occurred', ephemeral: true });
    }
  }
});

// Express server
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));
app.listen(PORT, () => console.log(`🖥️ Server running on port ${PORT}`));

// Start bot
client.login(CONFIG.DISCORD_TOKEN)
  .then(() => console.log('✅ Bot starting...'))
  .catch(err => console.error('❌ Login failed:', err));

// Error handling
process.on('unhandledRejection', err => console.error('⚠️ Unhandled rejection:', err));
process.on('uncaughtException', err => console.error('⚠️ Uncaught exception:', err));
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  client.destroy();
  mongoose.disconnect();
  process.exit(0);
});
