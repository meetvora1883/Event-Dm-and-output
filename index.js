require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  REST,
  Routes,
  MessageFlags
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
  "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖�": { type: "per_kill", amount: 20000 },
  "Family War": { type: "fixed", amount: 0 },
  "Money Printing Machine": { type: "fixed", amount: 0 },
  "Informal (Battle for business for unofficial organization)": { type: "per_kill", amount: 50000 }
};

// Ineligible roles
const INELIGIBLE_ROLES = process.env.INELIGIBLE_ROLES?.split(',') || [];

// Event names
const EVENT_NAMES = Object.keys(EVENT_BONUS_CONFIG);

// Configuration
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || ['1398888612388540538', '1398888612388540537'],
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID || '1398888617312518188',
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID || '1402002510885163058'
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

// Import command handlers
const bonusCommands = require('./commands/bonus');
const attendanceCommands = require('./commands/attendance');

// Combine all commands
const allCommands = {...bonusCommands, ...attendanceCommands};

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
      if (command) await command.execute(interaction, {
        client,
        CONFIG,
        EVENT_BONUS_CONFIG,
        INELIGIBLE_ROLES,
        EVENT_NAMES,
        MessageFlags // Pass MessageFlags to commands
      });
      return;
    }

    // Other interaction types can be handled here
  } catch (error) {
    console.error('❌ Interaction Handling Error:', error);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: '❌ An error occurred while processing this interaction',
        flags: MessageFlags.FLAGS.Ephemeral
      });
    }
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
