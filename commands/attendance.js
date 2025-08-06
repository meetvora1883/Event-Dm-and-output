const { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attendance')
    .setDescription('Record event attendance'),

  async execute(interaction, { client, EVENT_NAMES }) {
    if (!client.config.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      return interaction.reply({ 
        content: '⛔ You lack permissions', 
        ephemeral: true 
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('attendance-event-select')
      .setPlaceholder('Select event')
      .addOptions(EVENT_NAMES.map(event => ({
        label: event.length > 25 ? `${event.slice(0, 22)}...` : event,
        value: event
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ 
      content: '📋 Select an event:', 
      components: [row], 
      ephemeral: true 
    });
  },

  async handleEventSelect(interaction, { client, EVENT_BONUS_CONFIG }) {
    await interaction.deferUpdate();
    const eventName = interaction.values[0];
    const tomorrow = client.helpers.getTomorrowDate();

    client.attendanceData = client.attendanceData || {};
    client.attendanceData[interaction.message.interaction.id] = { eventName };

    const dateSelect = new StringSelectMenuBuilder()
      .setCustomId('attendance-date-select')
      .setPlaceholder('Select date')
      .addOptions([
        { label: `Tomorrow (${tomorrow})`, value: 'tomorrow' },
        { label: 'Custom date', value: 'custom' }
      ]);

    const row = new ActionRowBuilder().addComponents(dateSelect);
    await interaction.editReply({
      content: `✅ Selected: **${eventName}**\n\n📅 Select date:`,
      components: [row]
    });
  }
};
