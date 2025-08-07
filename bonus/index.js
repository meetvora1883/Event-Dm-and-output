const { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { 
  isEligibleForBonus,
  calculateBonus,
  addCustomBonus,
  lessBonus,
  markBonusAsPaid,
  getBonusSummary,
  getAllBonuses,
  getOutstandingBonuses,
  EVENT_BONUSES
} = require('./bonus');

// Initialize bonus commands
function initBonusCommands(client) {
  // /addbonus command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'addbonus') return;

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const description = interaction.options.getString('description') || 'Custom Bonus';

    try {
      await addCustomBonus(user.id, user.username, amount, description);
      await interaction.reply({
        content: `✅ Added $${amount} bonus to ${user.username}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Add Bonus Error:', error);
      await interaction.reply({
        content: '❌ Failed to add bonus',
        ephemeral: true
      });
    }
  });

  // /lessbonus command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'lessbonus') return;

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const description = interaction.options.getString('description') || 'Bonus Deduction';

    try {
      await lessBonus(user.id, user.username, amount, description);
      await interaction.reply({
        content: `✅ Deducted $${amount} from ${user.username}'s bonus`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Less Bonus Error:', error);
      await interaction.reply({
        content: '❌ Failed to deduct bonus',
        ephemeral: true
      });
    }
  });

  // /bonuspaid command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'bonuspaid') return;

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    try {
      const bonusRecord = await markBonusAsPaid(user.id, amount);
      if (!bonusRecord) {
        return interaction.reply({
          content: '❌ No bonus record found for this user',
          ephemeral: true
        });
      }

      // Send DM to user
      try {
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('💰 Bonus Payment Received')
          .setDescription(`You've received payment for your bonuses`)
          .addFields(
            { name: 'Amount Paid', value: `$${amount}`, inline: true },
            { name: 'Remaining Bonus', value: `$${bonusRecord.outstandingBonus}`, inline: true }
          );

        await user.send({ embeds: [embed] });
      } catch (dmError) {
        console.error('Failed to send DM:', dmError);
      }

      await interaction.reply({
        content: `✅ Marked $${amount} as paid for ${user.username}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Bonus Paid Error:', error);
      await interaction.reply({
        content: '❌ Failed to mark bonus as paid',
        ephemeral: true
      });
    }
  });

  // /listbonus command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'listbonus') return;

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    try {
      const allBonuses = await getAllBonuses();
      if (allBonuses.length === 0) {
        return interaction.reply({
          content: 'No bonus records found',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📊 All Bonus Records')
        .setDescription('Total bonus statistics for all users');

      let totalAll = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      for (const record of allBonuses) {
        totalAll += record.totalBonus;
        totalPaid += record.paidBonus;
        totalOutstanding += record.outstandingBonus;
      }

      embed.addFields(
        { name: 'Total Bonus', value: `$${totalAll}`, inline: true },
        { name: 'Total Paid', value: `$${totalPaid}`, inline: true },
        { name: 'Total Outstanding', value: `$${totalOutstanding}`, inline: true }
      );

      // Add individual summaries (top 10)
      const topRecords = allBonuses
        .sort((a, b) => b.outstandingBonus - a.outstandingBonus)
        .slice(0, 10);

      for (const record of topRecords) {
        embed.addFields({
          name: record.username,
          value: `Total: $${record.totalBonus}\nPaid: $${record.paidBonus}\nOutstanding: $${record.outstandingBonus}`,
          inline: true
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('List Bonus Error:', error);
      await interaction.reply({
        content: '❌ Failed to retrieve bonus records',
        ephemeral: true
      });
    }
  });

  // /outstanding_bonus_dm command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'outstanding_bonus_dm') return;

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    try {
      const outstandingBonuses = await getOutstandingBonuses();
      if (outstandingBonuses.length === 0) {
        return interaction.reply({
          content: 'No outstanding bonuses found',
          ephemeral: true
        });
      }

      let successCount = 0;
      let failCount = 0;

      for (const record of outstandingBonuses) {
        try {
          const user = await client.users.fetch(record.userId);
          const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('💰 Your Bonus Summary')
            .setDescription('Here is your current bonus status')
            .addFields(
              { name: 'Total Bonus Earned', value: `$${record.totalBonus}`, inline: true },
              { name: 'Bonus Paid', value: `$${record.paidBonus}`, inline: true },
              { name: 'Outstanding Bonus', value: `$${record.outstandingBonus}`, inline: true }
            );

          await user.send({ embeds: [embed] });
          successCount++;
        } catch (dmError) {
          console.error(`Failed to send DM to ${record.username}:`, dmError);
          failCount++;
        }
      }

      await interaction.reply({
        content: `✅ Sent DMs to ${successCount} users. Failed to send to ${failCount} users.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Outstanding Bonus DM Error:', error);
      await interaction.reply({
        content: '❌ Failed to send outstanding bonus DMs',
        ephemeral: true
      });
    }
  });

  // /kills command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'kills') return;

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    const eventName = interaction.options.getString('event');
    const date = interaction.options.getString('date') || new Date().toLocaleDateString('en-GB');
    const count = interaction.options.getInteger('count') || 1;
    const users = interaction.options.getMentionable('users');

    // Check if event is valid for kills
    const eventBonus = EVENT_BONUSES[eventName];
    if (!eventBonus || eventBonus.type !== 'kill') {
      return interaction.reply({
        content: '❌ This event does not have kill-based bonuses or is invalid',
        ephemeral: true
      });
    }

    try {
      for (const user of users) {
        await calculateBonus(user.id, user.username, eventName, date, 'kill', count);
      }

      await interaction.reply({
        content: `✅ Recorded ${count} kills for ${users.length} users in ${eventName}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Kills Command Error:', error);
      await interaction.reply({
        content: '❌ Failed to record kills',
        ephemeral: true
      });
    }
  });

  // /parachute command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'parachute') return;

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }

    const eventName = interaction.options.getString('event');
    const date = interaction.options.getString('date') || new Date().toLocaleDateString('en-GB');
    const count = interaction.options.getInteger('count') || 1;
    const users = interaction.options.getMentionable('users');

    // Check if event is valid for parachute
    const eventBonus = EVENT_BONUSES[eventName];
    if (!eventBonus || eventBonus.type !== 'parachute') {
      return interaction.reply({
        content: '❌ This event does not have parachute-based bonuses or is invalid',
        ephemeral: true
      });
    }

    try {
      for (const user of users) {
        await calculateBonus(user.id, user.username, eventName, date, 'parachute', count);
      }

      await interaction.reply({
        content: `✅ Recorded ${count} parachute takes for ${users.length} users in ${eventName}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Parachute Command Error:', error);
      await interaction.reply({
        content: '❌ Failed to record parachute takes',
        ephemeral: true
      });
    }
  });

  // /bonushelp command
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'bonushelp') return;

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🆘 Bonus System Help')
      .setDescription('Commands for managing the bonus system')
      .addFields(
        { name: '/addbonus', value: 'Add custom bonus to a user\nUsage: `/addbonus @user amount [description]`' },
        { name: '/lessbonus', value: 'Deduct bonus from a user\nUsage: `/lessbonus @user amount [description]`' },
        { name: '/bonuspaid', value: 'Mark bonus as paid\nUsage: `/bonuspaid @user amount`' },
        { name: '/listbonus', value: 'Show all bonus records\nUsage: `/listbonus`' },
        { name: '/outstanding_bonus_dm', value: 'Send DMs with bonus summaries\nUsage: `/outstanding_bonus_dm`' },
        { name: '/kills', value: 'Record kills for kill-based events\nUsage: `/kills @users event [date] [count]`' },
        { name: '/parachute', value: 'Record parachute takes\nUsage: `/parachute @users event [date] [count]`' }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  });
}

module.exports = { initBonusCommands };
