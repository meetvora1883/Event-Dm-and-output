const { EmbedBuilder } = require('discord.js');

module.exports = {
  addbonus: {
    data: new SlashCommandBuilder()
      .setName('addbonus')
      .setDescription('Add bonus to user')
      .addUserOption(option => 
        option.setName('user')
          .setDescription('User to add bonus to')
          .setRequired(true))
      .addIntegerOption(option => 
        option.setName('amount')
          .setDescription('Bonus amount')
          .setRequired(true))
      .addStringOption(option => 
        option.setName('reason')
          .setDescription('Reason for bonus')),

    async execute(interaction, { Bonus }) {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      try {
        const bonus = await Bonus.findOneAndUpdate(
          { userId: user.id },
          {
            $inc: { totalBonus: amount, outstanding: amount },
            $set: { username: user.username },
            $push: { transactions: { amount, type: 'add', reason } }
          },
          { upsert: true, new: true }
        );

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('💰 Bonus Added')
          .addFields(
            { name: 'User', value: user.username, inline: true },
            { name: 'Amount', value: `$${amount}`, inline: true },
            { name: 'Total', value: `$${bonus.totalBonus}`, inline: true },
            { name: 'Reason', value: reason }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Bonus error:', error);
        await interaction.reply({ 
          content: '❌ Failed to add bonus', 
          ephemeral: true 
        });
      }
    }
  }
};
