const { 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const mongoose = require('mongoose');

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  eventName: String,
  date: String,
  userId: String,
  username: String,
  timestamp: { type: Date, default: Date.now },
  actionCount: Number
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = {
  help: {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Show bot help'),
    async execute(interaction, { CONFIG }) {
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Attendance Bot Help')
        .setDescription('A bot to manage event attendance and POV submissions')
        .addFields(
          { name: '📋 Commands', value: '/attendance - Record event attendance\n/help - Show this message\n/bonushelp - Show bonus commands\n/parachute - Record parachute collections\n/kills - Record kills' },
          { name: '📝 Usage', value: '1. Use /attendance\n2. Select event\n3. Choose date\n4. Mention participants\n5. Provide counts for per-action events' }
        );
      await interaction.reply({ 
        embeds: [helpEmbed], 
        flags: MessageFlags.FLAGS.Ephemeral
      });
    }
  },
  attendance: {
    data: new SlashCommandBuilder()
      .setName('attendance')
      .setDescription('Record event attendance'),
    async execute(interaction, { CONFIG, EVENT_NAMES }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          flags: MessageFlags.FLAGS.Ephemeral
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
        flags: MessageFlags.FLAGS.Ephemeral
      });
    }
  }
};
