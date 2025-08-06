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
    event: String,
    date: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const Bonus = mongoose.model('Bonus', bonusSchema);

// Helper function to update bonus
async function updateBonus(userId, username, amount, type, reason, eventName, date) {
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
      transaction = { amount, type, reason, event: eventName, date };
      break;
    case 'deduct':
      bonus.totalBonus -= amount;
      bonus.outstanding -= amount;
      transaction = { amount: -amount, type, reason, event: eventName, date };
      break;
    case 'paid':
      if (amount > bonus.outstanding) {
        throw new Error('Amount exceeds outstanding bonus');
      }
      bonus.paid += amount;
      bonus.outstanding -= amount;
      transaction = { amount, type, reason, event: eventName, date };
      break;
    default:
      throw new Error('Invalid transaction type');
  }
  
  bonus.transactions.push(transaction);
  await bonus.save();
  return bonus;
}

module.exports = {
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
    async execute(interaction, { CONFIG }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ 
          content: '⛔ You lack permissions for this command.', 
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }
      
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      try {
        await updateBonus(user.id, user.username, amount, 'add', reason);
        await interaction.reply({ 
          content: `✅ Added $${amount} bonus to ${user.username} for: ${reason}`,
          flags: MessageFlags.FLAGS.Ephemeral
        });
      } catch (error) {
        console.error('Add Bonus Error:', error);
        await interaction.reply({ 
          content: `❌ Failed to add bonus: ${error.message}`,
          flags: MessageFlags.FLAGS.Ephemeral
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
    async execute(interaction, { CONFIG }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ 
          content: '⛔ You lack permissions for this command.', 
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }
      
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      try {
        await updateBonus(user.id, user.username, amount, 'deduct', reason);
        await interaction.reply({ 
          content: `✅ Deducted $${amount} from ${user.username} for: ${reason}`,
          flags: MessageFlags.FLAGS.Ephemeral
        });
      } catch (error) {
        console.error('Less Bonus Error:', error);
        await interaction.reply({ 
          content: `❌ Failed to deduct bonus: ${error.message}`,
          flags: MessageFlags.FLAGS.Ephemeral
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
    async execute(interaction, { CONFIG }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ 
          content: '⛔ You lack permissions for this command.', 
          flags: MessageFlags.FLAGS.Ephemeral
        });
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
          flags: MessageFlags.FLAGS.Ephemeral
        });
      } catch (error) {
        console.error('Bonus Paid Error:', error);
        await interaction.reply({ 
          content: `❌ Failed to mark bonus as paid: ${error.message}`,
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }
    }
  },
  listbonus: {
    data: new SlashCommandBuilder()
      .setName('listbonus')
      .setDescription('List all bonus records'),
    async execute(interaction, { CONFIG }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ 
          content: '⛔ You lack permissions for this command.', 
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }
      
      try {
        const bonuses = await Bonus.find().lean().sort({ outstanding: -1, username: 1 });
        
        if (bonuses.length === 0) {
          return interaction.reply({ 
            content: 'No bonus records found.', 
            flags: MessageFlags.FLAGS.Ephemeral
          });
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
        
        await interaction.reply({ 
          embeds: [embed], 
          flags: MessageFlags.FLAGS.Ephemeral
        });
      } catch (error) {
        console.error('List Bonus Error:', error);
        await interaction.reply({ 
          content: '❌ Failed to retrieve bonus records',
          flags: MessageFlags.FLAGS.Ephemeral
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
          { name: '/listbonus', value: 'List all bonus records' },
          { name: '/parachute', value: 'Record parachute collections\nUsage: /parachute user: @User count: Number date: DD/MM/YYYY event: EventName' },
          { name: '/kills', value: 'Record kills\nUsage: /kills user: @User count: Number date: DD/MM/YYYY event: EventName' }
        );
      
      await interaction.reply({ 
        embeds: [embed], 
        flags: MessageFlags.FLAGS.Ephemeral
      });
    }
  },
  parachute: {
    data: new SlashCommandBuilder()
      .setName('parachute')
      .setDescription('Record parachute collections for an event')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The user to record for')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('count')
          .setDescription('Number of parachutes collected')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('event')
          .setDescription('Event name')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('date')
          .setDescription('Event date (DD/MM/YYYY)')
          .setRequired(true)),
    async execute(interaction, { CONFIG, EVENT_BONUS_CONFIG }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ 
          content: '⛔ You lack permissions for this command.', 
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }

      const user = interaction.options.getUser('user');
      const count = interaction.options.getInteger('count');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');

      try {
        // Get bonus config
        const bonusConfig = EVENT_BONUS_CONFIG[eventName];
        if (!bonusConfig || bonusConfig.type !== 'per_action' || bonusConfig.action !== 'parachute') {
          return interaction.reply({
            content: '❌ This event is not configured for parachute collections',
            flags: MessageFlags.FLAGS.Ephemeral
          });
        }

        // Calculate bonus
        const bonusAmount = count * bonusConfig.amount;
        
        // Update bonus record
        await updateBonus(
          user.id,
          user.username,
          bonusAmount,
          'add',
          `${count} parachutes in ${eventName}`,
          eventName,
          date
        );

        // Get bonus summary
        let bonusRecord = await Bonus.findOne({ userId: user.id });
        if (!bonusRecord) {
          bonusRecord = {
            totalBonus: 0,
            paid: 0,
            outstanding: 0
          };
        }

        // Send DM to user
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('🪂 Parachute Bonus Added')
          .setDescription(`You've earned $${bonusAmount} for parachute collections!`)
          .addFields(
            { name: 'Event', value: eventName, inline: true },
            { name: 'Date', value: date, inline: true },
            { name: 'Parachutes', value: count.toString(), inline: true },
            { name: 'Bonus Amount', value: `$${bonusAmount}`, inline: true },
            { name: 'Total Bonus', value: `$${bonusRecord.totalBonus + bonusAmount}`, inline: true },
            { name: 'Outstanding', value: `$${bonusRecord.outstanding + bonusAmount}`, inline: true }
          );

        try {
          await user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`Failed to send DM to ${user.username}:`, dmError);
        }

        await interaction.reply({
          content: `✅ Recorded ${count} parachutes for ${user.username} ($${bonusAmount} bonus)`,
          flags: MessageFlags.FLAGS.Ephemeral
        });
      } catch (error) {
        console.error('Parachute Command Error:', error);
        await interaction.reply({
          content: `❌ Failed to record parachutes: ${error.message}`,
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }
    }
  },
  kills: {
    data: new SlashCommandBuilder()
      .setName('kills')
      .setDescription('Record kills for an event')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The user to record for')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('count')
          .setDescription('Number of kills')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('event')
          .setDescription('Event name')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('date')
          .setDescription('Event date (DD/MM/YYYY)')
          .setRequired(true)),
    async execute(interaction, { CONFIG, EVENT_BONUS_CONFIG }) {
      if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
        return interaction.reply({ 
          content: '⛔ You lack permissions for this command.', 
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }

      const user = interaction.options.getUser('user');
      const count = interaction.options.getInteger('count');
      const eventName = interaction.options.getString('event');
      const date = interaction.options.getString('date');

      try {
        // Get bonus config
        const bonusConfig = EVENT_BONUS_CONFIG[eventName];
        if (!bonusConfig || bonusConfig.type !== 'per_kill') {
          return interaction.reply({
            content: '❌ This event is not configured for kill bonuses',
            flags: MessageFlags.FLAGS.Ephemeral
          });
        }

        // Calculate bonus
        const bonusAmount = count * bonusConfig.amount;
        
        // Update bonus record
        await updateBonus(
          user.id,
          user.username,
          bonusAmount,
          'add',
          `${count} kills in ${eventName}`,
          eventName,
          date
        );

        // Get bonus summary
        let bonusRecord = await Bonus.findOne({ userId: user.id });
        if (!bonusRecord) {
          bonusRecord = {
            totalBonus: 0,
            paid: 0,
            outstanding: 0
          };
        }

        // Send DM to user
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔫 Kill Bonus Added')
          .setDescription(`You've earned $${bonusAmount} for kills!`)
          .addFields(
            { name: 'Event', value: eventName, inline: true },
            { name: 'Date', value: date, inline: true },
            { name: 'Kills', value: count.toString(), inline: true },
            { name: 'Bonus Amount', value: `$${bonusAmount}`, inline: true },
            { name: 'Total Bonus', value: `$${bonusRecord.totalBonus + bonusAmount}`, inline: true },
            { name: 'Outstanding', value: `$${bonusRecord.outstanding + bonusAmount}`, inline: true }
          );

        try {
          await user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`Failed to send DM to ${user.username}:`, dmError);
        }

        await interaction.reply({
          content: `✅ Recorded ${count} kills for ${user.username} ($${bonusAmount} bonus)`,
          flags: MessageFlags.FLAGS.Ephemeral
        });
      } catch (error) {
        console.error('Kills Command Error:', error);
        await interaction.reply({
          content: `❌ Failed to record kills: ${error.message}`,
          flags: MessageFlags.FLAGS.Ephemeral
        });
      }
    }
  }
};
