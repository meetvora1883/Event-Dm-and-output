// index.js

require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    SlashCommandBuilder,
    Routes,
    REST
} = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');

// --- MODELS ---
const Attendance = require('./models/attendance'); // Assuming you have this model from your old code
const Bonus = require('./models/bonus');
const EventData = require('./models/eventData');

// --- INITIALIZE APP & CLIENT ---
const app = express();
const PORT = process.env.PORT || 10000;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages // Needed for sending DMs
    ]
});

// --- CONFIGURATION ---
const CONFIG = {
    POV_CHANNEL_ID: process.env.POV_CHANNEL_ID,
    OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID,
    ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS?.split(',') || [],
    NO_BONUS_ROLE_IDS: process.env.NO_BONUS_ROLE_IDS?.split(',') || [],
    COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    MONGODB_URI: process.env.MONGODB_URI
};

// --- DATABASE CONNECTION ---
mongoose.connect(CONFIG.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


// --- EVENT & BONUS DATA ---
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

const BONUS_CONFIG = {
    "Family raid (Attack)": { type: 'flat', amount: 15000 },
    "Family raid (Protection)": { type: 'flat', amount: 5000 },
    "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: 'flat', amount: 8000 },
    "Store robbery": { type: 'flat', amount: 15000 },
    "Attacking Prison": { type: 'flat', amount: 10000 },
    "State Object": { type: 'flat', amount: 8000 },
    "⭐🏢 SHOPPING CENTER": { type: 'flat', amount: 75000 },
    "⭐🏦 BANK ROBBERY": { type: 'flat', amount: 35000 },
    "⭐🎫 RP TICKET FACTORY": { type: 'flat', amount: 300000 },
    "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕": { type: 'flat', amount: 20000 },

    "⭐﻿🔫﻿ INFORMAL": { type: 'kill', amount: 50000 },
    "⭐🔫 WEAPONS FACTORY": { type: 'kill', amount: 25000 },
    "⭐🔫 BUSINESS WAR": { type: 'kill', amount: 80000 },
    "⭐🏨 HOTEL TAKEOVER": { type: 'kill', amount: 20000 },
    "⭐﻿🔫﻿ RATING BATTLE": { type: 'kill', amount: 20000 },
    "⭐🔫 CAPTURE OF FOUNDRY": { type: 'kill', amount: 20000 },

    "⭐⛴️ AIR CRAFT CARRIER": { type: 'parachute', amount: 50000 },
    "⭐🛡️  HARBOR EVENT": { type: 'parachute', amount: 25000 },
};

const KILL_BASED_EVENTS = Object.keys(BONUS_CONFIG).filter(k => BONUS_CONFIG[k].type === 'kill');
const PARACHUTE_BASED_EVENTS = Object.keys(BONUS_CONFIG).filter(k => BONUS_CONFIG[k].type === 'parachute');


// --- EXPRESS SERVER (for Render Health Checks & Keep-alive) ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));
app.get('/api/status', (req, res) => res.json({ status: 'online', bot: client.readyAt ? 'connected' : 'connecting' }));
app.listen(PORT, () => console.log(`🖥️ Server running on port ${PORT}`));
setInterval(() => axios.get(`http://localhost:${PORT}/api/status`).catch(() => console.warn('⚠️ Keepalive ping failed.')), 300000);


// --- UTILITY FUNCTIONS ---
const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};
const getTomorrowDate = () => formatDate(new Date(Date.now() + 86400000));
const isValidDate = (dateString) => /^\d{2}\/\d{2}\/\d{4}$/.test(dateString);


// --- BOT READY EVENT ---
client.on('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
});


// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Helper for admin role check
    const isAdmin = () => CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId));

    try {
        if (interaction.commandName === 'help') {
            await handleHelpCommand(interaction);
        } else if (interaction.commandName === 'attendance') {
            if (!isAdmin()) return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
            await handleAttendanceCommand(interaction);
        } else if (interaction.commandName === 'kills') {
            if (!isAdmin()) return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
            await handleDataLogCommand(interaction, 'kills', 'kill');
        } else if (interaction.commandName === 'parachutes') {
            if (!isAdmin()) return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
            await handleDataLogCommand(interaction, 'parachutes', 'parachute');
        } else if (interaction.commandName === 'bonus') {
            if (!isAdmin()) return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
            await handleBonusCommand(interaction);
        }
    } catch (error) {
        console.error(`Error handling /${interaction.commandName}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true });
        } else {
            await interaction.followUp({ content: '❌ An error occurred while executing this command.', ephemeral: true });
        }
    }
});


// --- COMMAND HANDLERS ---

async function handleHelpCommand(interaction) {
    const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Bot Help')
        .setDescription('Here are the available commands:')
        .addFields(
            { name: '📝 Attendance', value: '`/attendance` - Start the attendance process. Admin only.' },
            { name: '🎯 Log Kills', value: '`/kills [user] [event] [count]` - Log kills for a user for an event *before* running attendance. Admin only.' },
            { name: '🪂 Log Parachutes', value: '`/parachutes [user] [event] [count]` - Log parachutes collected by a user. Admin only.' },
            { name: '💰 Bonus Management', value: '`/bonus [subcommand]` - Manage user bonuses (add, subtract, paid, list, dm-summary). Admin only.' },
            { name: '❓ Help', value: '`/help` - Shows this help message.' }
        );
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
}

async function handleAttendanceCommand(interaction) {
    const eventSelect = new StringSelectMenuBuilder()
        .setCustomId(JSON.stringify({ action: 'event-select' }))
        .setPlaceholder('Choose the event...')
        .addOptions(EVENT_NAMES.map(event => ({
            label: event.length > 90 ? `${event.substring(0, 87)}...` : event,
            value: event
        })));

    const row = new ActionRowBuilder().addComponents(eventSelect);
    await interaction.reply({ content: '📋 **Step 1/3: Select an event**', components: [row], ephemeral: true });
}

async function handleDataLogCommand(interaction, typePlural, typeSingular) {
    const user = interaction.options.getUser('user');
    const eventName = interaction.options.getString('event');
    const count = interaction.options.getInteger('count');
    const date = interaction.options.getString('date') || formatDate(new Date());

    if (!isValidDate(date)) {
        return interaction.reply({ content: '❌ Invalid date format. Please use `DD/MM/YYYY`.', ephemeral: true });
    }

    await EventData.findOneAndUpdate(
        { userId: user.id, eventName, date, type: typeSingular },
        { count },
        { upsert: true, new: true }
    );

    await interaction.reply({ content: `✅ Logged **${count} ${typePlural}** for **${user.username}** in **${eventName}** on **${date}**.`, ephemeral: true });
}

async function handleBonusCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason');

    let bonusData = await Bonus.findOne({ userId: user.id });
    if (!bonusData) {
        bonusData = new Bonus({ userId: user.id, username: user.username });
    }

    let description = '';
    let transactionType = subcommand;

    switch (subcommand) {
        case 'add':
            bonusData.totalBonus += amount;
            bonusData.transactions.push({ type: 'add', amount, reason: reason || 'Manual adjustment' });
            description = `💰 Added **$${amount.toLocaleString()}** to ${user.tag}'s bonus.`;
            break;
        case 'subtract':
            bonusData.totalBonus -= amount;
            // Ensure bonus doesn't go negative, or adjust as needed
            if (bonusData.totalBonus < bonusData.paidBonus) {
                 bonusData.totalBonus = bonusData.paidBonus; // Prevents outstanding from going negative
            }
            bonusData.transactions.push({ type: 'subtract', amount: -amount, reason: reason || 'Manual adjustment' });
            description = `💸 Subtracted **$${amount.toLocaleString()}** from ${user.tag}'s bonus.`;
            break;
        case 'paid':
            const outstanding = bonusData.totalBonus - bonusData.paidBonus;
            const paidAmount = Math.min(amount, outstanding); // Can't pay more than what's outstanding
            if (paidAmount <= 0) return interaction.reply({content: `${user.tag} has no outstanding bonus to pay.`, ephemeral: true});
            
            bonusData.paidBonus += paidAmount;
            bonusData.transactions.push({ type: 'paid', amount: paidAmount, reason: reason || 'Bonus Payout' });
            
            description = `✅ Marked **$${paidAmount.toLocaleString()}** as paid for ${user.tag}.`;
            // Send DM confirmation for payment
            const dmEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('💸 Bonus Payout Confirmation')
                .setDescription(`A bonus payout of **$${paidAmount.toLocaleString()}** has been processed for you.`)
                .addFields(
                    { name: 'New Total Paid', value: `$${bonusData.paidBonus.toLocaleString()}`, inline: true },
                    { name: 'New Outstanding', value: `$${(bonusData.totalBonus - bonusData.paidBonus).toLocaleString()}`, inline: true }
                )
                .setTimestamp();
            await user.send({ embeds: [dmEmbed] }).catch(err => console.log(`Could not DM ${user.tag}: ${err.message}`));
            break;

        case 'list':
            const allBonuses = await Bonus.find({}).sort({ totalBonus: -1 });
            if (allBonuses.length === 0) {
                return interaction.reply({ content: 'No bonus data found for any user.', ephemeral: true });
            }
            const listEmbed = new EmbedBuilder()
                .setColor(0xFAA81A)
                .setTitle('👑 Bonus Leaderboard')
                .setDescription(allBonuses.map((b, index) => {
                    const outstanding = b.totalBonus - b.paidBonus;
                    return `**${index + 1}. ${b.username}**\n- Outstanding: \`$${outstanding.toLocaleString()}\`\n- Total Earned: \`$${b.totalBonus.toLocaleString()}\` | Paid: \`$${b.paidBonus.toLocaleString()}\``;
                }).join('\n\n'))
                .setTimestamp();
            return interaction.reply({ embeds: [listEmbed] });

        case 'dm-summary':
             const allUsersWithBonus = await Bonus.find({});
             await interaction.reply({ content: `📬 Sending bonus summaries to ${allUsersWithBonus.length} users...`, ephemeral: true });

             for(const b of allUsersWithBonus) {
                const member = await interaction.guild.members.fetch(b.userId).catch(() => null);
                if(!member) continue;

                const outstanding = b.totalBonus - b.paidBonus;
                const summaryEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('📊 Your Bonus Summary')
                    .setDescription(`Here is your current bonus status.`)
                    .addFields(
                        { name: 'Total Earned', value: `$${b.totalBonus.toLocaleString()}`, inline: true },
                        { name: 'Total Paid', value: `$${b.paidBonus.toLocaleString()}`, inline: true },
                        { name: '💰 Outstanding', value: `**$${outstanding.toLocaleString()}**`, inline: true }
                    )
                    .setTimestamp();
                
                await member.send({embeds: [summaryEmbed]}).catch(e => console.log(`Failed to DM summary to ${b.username}`));
             }
             return interaction.followUp({content: `✅ DMs sent!`, ephemeral: true});
    }

    await bonusData.save();
    await interaction.reply({ content: description, ephemeral: true });
}


// --- COMPONENT INTERACTION HANDLERS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    
    const customId = JSON.parse(interaction.customId);

    try {
        await interaction.deferUpdate();
        
        if (customId.action === 'event-select') {
            await handleEventSelection(interaction, customId);
        } else if (customId.action === 'date-select') {
            await handleDateSelection(interaction, customId);
        } else if (customId.action === 'win-select') {
             await handleWinSelection(interaction, customId);
        }

    } catch (error) {
        console.error('Component Interaction Error:', error);
    }
});

async function handleEventSelection(interaction) {
    const eventName = interaction.values[0];
    const tomorrow = getTomorrowDate();

    const dateSelect = new StringSelectMenuBuilder()
        .setCustomId(JSON.stringify({ action: 'date-select', eventName }))
        .setPlaceholder('Choose a date option...')
        .addOptions([
            { label: `Tomorrow (${tomorrow})`, value: tomorrow },
            { label: 'Enter a Custom Date', value: 'custom' }
        ]);
    
    const row = new ActionRowBuilder().addComponents(dateSelect);
    await interaction.editReply({
        content: `✅ Event: **${eventName}**\n\n📅 **Step 2/3: Select a date**`,
        components: [row]
    });
}

async function handleDateSelection(interaction, customId) {
    const { eventName } = customId;
    const dateOption = interaction.values[0];

    if (dateOption === 'custom') {
        await interaction.editReply({
            content: `✅ Event: **${eventName}**\n\nPlease reply with the custom date in \`DD/MM/YYYY\` format.`,
            components: []
        });
        const filter = m => m.author.id === interaction.user.id && isValidDate(m.content.trim());
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async msg => {
            await msg.delete().catch(()=>{});
            askForWinConfirmation(interaction, eventName, msg.content.trim());
        });
    } else {
        askForWinConfirmation(interaction, eventName, dateOption);
    }
}

async function askForWinConfirmation(interaction, eventName, date) {
    const winSelect = new StringSelectMenuBuilder()
        .setCustomId(JSON.stringify({ action: 'win-select', eventName, date }))
        .setPlaceholder('Did you win the event?')
        .addOptions([
            { label: '✅ Yes, we won (Apply Bonus)', value: 'yes' },
            { label: '❌ No, we lost (No Bonus)', value: 'no' },
            { label: '💰 Custom Bonus', value: 'custom' },
        ]);
    
    const row = new ActionRowBuilder().addComponents(winSelect);
    await interaction.editReply({
        content: `✅ Event: **${eventName}**\n📅 Date: **${date}**\n\n🏆 **Did you win? (This determines the bonus)**`,
        components: [row]
    });
}

async function handleWinSelection(interaction, customId) {
    const { eventName, date } = customId;
    const winStatus = interaction.values[0];

    await interaction.editReply({
        content: `✅ Event: **${eventName}**\n📅 Date: **${date}**\n🏆 Status: **${winStatus.toUpperCase()}**\n\n👥 **Step 3/3: Mention all participants below.**`,
        components: []
    });

    const filter = m => m.author.id === interaction.user.id && m.mentions.users.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 120000, max: 1 });

    collector.on('collect', async msg => {
        const users = msg.mentions.users;
        await msg.delete().catch(()=>{});
        await processAttendanceAndBonuses(interaction, eventName, date, winStatus, users);
    });
}


// --- CORE LOGIC: PROCESS ATTENDANCE & BONUSES ---

async function processAttendanceAndBonuses(interaction, eventName, date, winStatus, users) {
    const outputChannel = await client.channels.fetch(CONFIG.OUTPUT_CHANNEL_ID);
    if (!outputChannel) {
        return interaction.followUp({ content: '❌ Output channel not found!', ephemeral: true });
    }

    const eventBonusInfo = BONUS_CONFIG[eventName];
    let processingPromises = [];

    for (const user of users.values()) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) continue;

        processingPromises.push(
            (async () => {
                let bonusAmount = 0;
                let bonusReason = `Attendance for ${eventName}`;
                const isBonusEligible = !CONFIG.NO_BONUS_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));

                // --- Calculate Bonus ---
                if (winStatus === 'yes' && eventBonusInfo) {
                    switch (eventBonusInfo.type) {
                        case 'flat':
                            bonusAmount = eventBonusInfo.amount;
                            break;
                        case 'kill':
                        case 'parachute':
                            const dataType = eventBonusInfo.type;
                            const eventData = await EventData.findOne({ userId: user.id, eventName, date, type: dataType });
                            if (eventData) {
                                bonusAmount = eventData.count * eventBonusInfo.amount;
                                bonusReason = `${eventData.count} ${dataType}s in ${eventName}`;
                                await EventData.deleteOne({ _id: eventData._id }); // Clean up data
                            } else {
                                bonusReason = `Attendance for ${eventName} (No ${eventName} (No ${dataType} data logged)`;
                            }
                            break;
                    }
                } else if (winStatus === 'custom') {
                    // In a real scenario, you'd prompt for the custom amount here.
                    // For now, let's assume a prompt would happen. This is an advanced feature.
                    // Let's just mark as custom for now.
                    bonusReason = `Custom bonus for ${eventName}`;
                }

                // --- Save Attendance ---
                await new Attendance({ eventName, date, userId: user.id, username: user.username }).save();

                // --- Update Bonus Data & Send DM ---
                const bonusData = await Bonus.findOneAndUpdate(
                    { userId: user.id },
                    { $setOnInsert: { username: user.username } },
                    { upsert: true, new: true }
                );
                
                if (isBonusEligible && bonusAmount > 0) {
                    bonusData.totalBonus += bonusAmount;
                    bonusData.transactions.push({ type: 'earn', amount: bonusAmount, reason: bonusReason, date: new Date() });
                    await bonusData.save();
                }

                const outstanding = bonusData.totalBonus - bonusData.paidBonus;
                const dmEmbed = new EmbedBuilder()
                    .setColor(bonusAmount > 0 ? 0x57F287 : 0xED4245)
                    .setTitle('🎉 Event Attendance Confirmed')
                    .setDescription(`Thank you for participating in **${eventName}** on **${date}**.`)
                    .addFields(
                        { name: '💰 Bonus From This Event', value: `${isBonusEligible ? `$${bonusAmount.toLocaleString()}` : `~$${bonusAmount.toLocaleString()} (Not eligible)`}` },
                        { name: '--- Your Overall Summary ---', value: '\u200B' },
                        { name: 'Total Earned', value: `$${bonusData.totalBonus.toLocaleString()}`, inline: true },
                        { name: 'Total Paid', value: `$${bonusData.paidBonus.toLocaleString()}`, inline: true },
                        { name: 'Outstanding', value: `**$${outstanding.toLocaleString()}**`, inline: true },
                        { name: '📸 POV Submission', value: `Please submit your POV in <#${CONFIG.POV_CHANNEL_ID}> with the format:\n\`\`\`"${eventName} | @${user.username}"\n"${date}"\`\`\`` }
                    )
                    .setTimestamp();
                
                await user.send({ embeds: [dmEmbed] }).catch(() => console.log(`Could not DM user ${user.tag}`));
                
                return { user, success: true };
            })()
        );
    }

    const results = await Promise.all(processingPromises);
    const successfulUsers = results.filter(r => r.success).map(r => r.user);

    // --- Send Summary to Output Channel ---
    const participantList = successfulUsers.map(u => `• <@${u.id}>`).join('\n');
    const outputEmbed = new EmbedBuilder()
        .setTitle(`📝 Attendance: ${eventName}`)
        .setColor(0x3498DB)
        .addFields(
            { name: '📅 Date', value: date, inline: true },
            { name: '🏆 Result', value: winStatus.toUpperCase(), inline: true },
            { name: '👥 Participants', value: participantList || 'None' }
        )
        .setTimestamp();

    await outputChannel.send({ embeds: [outputEmbed] });

    await interaction.followUp({
        content: `✅ Attendance recorded for **${successfulUsers.length}** users! A summary has been posted in ${outputChannel}.`,
        ephemeral: true
    });
}


// --- SLASH COMMAND REGISTRATION ---
async function registerCommands() {
    const commands = [
        new SlashCommandBuilder().setName('help').setDescription('Shows the help menu with all commands.'),
        new SlashCommandBuilder().setName('attendance').setDescription('Starts the process for recording event attendance and bonuses.'),
        new SlashCommandBuilder()
            .setName('kills')
            .setDescription('Log the number of kills for a user in a specific event.')
            .addUserOption(option => option.setName('user').setDescription('The user who got the kills').setRequired(true))
            .addStringOption(option => option.setName('event').setDescription('The event name').setRequired(true).addChoices(...KILL_BASED_EVENTS.map(e => ({name: e, value: e}))))
            .addIntegerOption(option => option.setName('count').setDescription('Number of kills').setRequired(true))
            .addStringOption(option => option.setName('date').setDescription('Date of the event (DD/MM/YYYY), defaults to today.')),
        new SlashCommandBuilder()
            .setName('parachutes')
            .setDescription('Log the number of parachutes for a user in a specific event.')
            .addUserOption(option => option.setName('user').setDescription('The user who got the parachutes').setRequired(true))
            .addStringOption(option => option.setName('event').setDescription('The event name').setRequired(true).addChoices(...PARACHUTE_BASED_EVENTS.map(e => ({name: e, value: e}))))
            .addIntegerOption(option => option.setName('count').setDescription('Number of parachutes').setRequired(true))
            .addStringOption(option => option.setName('date').setDescription('Date of the event (DD/MM/YYYY), defaults to today.')),
        new SlashCommandBuilder()
            .setName('bonus')
            .setDescription('Manage user bonuses.')
            .addSubcommand(sub => sub.setName('list').setDescription('Lists all users with their bonus balances.'))
            .addSubcommand(sub => sub.setName('dm-summary').setDescription('Sends a bonus summary DM to all relevant users.'))
            .addSubcommand(sub =>
                sub.setName('add')
                .setDescription('Manually add bonus to a user.')
                .addUserOption(option => option.setName('user').setDescription('The user to add bonus to').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('The amount of bonus to add').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('The reason for this addition').setRequired(true)))
            .addSubcommand(sub =>
                sub.setName('subtract')
                .setDescription('Manually subtract bonus from a user.')
                .addUserOption(option => option.setName('user').setDescription('The user to subtract bonus from').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('The amount of bonus to subtract').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('The reason for this subtraction')))
            .addSubcommand(sub =>
                sub.setName('paid')
                .setDescription('Mark an amount of a user\'s bonus as paid.')
                .addUserOption(option => option.setName('user').setDescription('The user whose bonus was paid').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('The amount that was paid').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Optional note for the payment')))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);

    try {
        console.log('🔄 Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(CONFIG.CLIENT_ID, 'YOUR_GUILD_ID_HERE'), // <-- IMPORTANT: Put your server's ID here!
            { body: commands },
        );
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Failed to reload application commands:', error);
    }
}


// --- LOGIN ---
client.login(CONFIG.DISCORD_TOKEN).then(() => {
    registerCommands();
}).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});
