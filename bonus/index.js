const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Bonus, EVENT_BONUS_CONFIG, INELIGIBLE_ROLES } = require('./bonus');
const CONFIG = require('../config');

console.log('✅ bonus/index.js loaded successfully');

async function updateBonus(userId, username, amount, type, reason) {
  console.log(`🔄 Processing ${type} bonus for ${username} (${userId}): $${amount}`);
  
  let bonus = await Bonus.findOne({ userId });
  
  if (!bonus) {
    console.log('➕ Creating new bonus record for user');
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
      transaction = { amount, type, reason };
      console.log(`➕ Added $${amount} to user's bonus`);
      break;
    case 'deduct':
      bonus.totalBonus -= amount;
      bonus.outstanding -= amount;
      transaction = { amount: -amount, type, reason };
      console.log(`➖ Deducted $${amount} from user's bonus`);
      break;
    case 'paid':
      if (amount > bonus.outstanding) {
        throw new Error('Amount exceeds outstanding bonus');
      }
      bonus.paid += amount;
      bonus.outstanding -= amount;
      transaction = { amount, type, reason };
      console.log(`💰 Marked $${amount} as paid`);
      break;
    default:
      throw new Error('Invalid transaction type');
  }
  
  bonus.transactions.push(transaction);
  await bonus.save();
  console.log('💾 Saved bonus record to database');
  return bonus;
}

// Add bonus command
const addbonusCommand = {
  data: new SlashCommandBuilder()
    .setName('addbonus')
    .setDescription('Add bonus to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to add bonus to')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Amount to add')
        .setRequired(true)
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for adding bonus')
        .setRequired(false)),
  async execute(interaction) {
    console.log(`⚡ Executing /addbonus command by ${interaction.user.tag}`);
    
    if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      console.log('⛔ User lacks permissions for this command');
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }
    
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      await updateBonus(user.id, user.username, amount, 'add', reason);
      console.log(`✅ Added $${amount} bonus to ${user.username}`);
      await interaction.reply({ 
        content: `✅ Added $${amount} bonus to ${user.username} for: ${reason}`,
        ephemeral: true 
      });
    } catch (error) {
      console.error('❌ Add Bonus Error:', error);
      await interaction.reply({ 
        content: `❌ Failed to add bonus: ${error.message}`,
        ephemeral: true 
      });
    }
  }
};

// Less bonus command
const lessbonusCommand = {
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
  async execute(interaction) {
    console.log(`⚡ Executing /lessbonus command by ${interaction.user.tag}`);
    
    if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      console.log('⛔ User lacks permissions for this command');
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }
    
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      await updateBonus(user.id, user.username, amount, 'deduct', reason);
      console.log(`✅ Deducted $${amount} from ${user.username}`);
      await interaction.reply({ 
        content: `✅ Deducted $${amount} from ${user.username} for: ${reason}`,
        ephemeral: true 
      });
    } catch (error) {
      console.error('❌ Less Bonus Error:', error);
      await interaction.reply({ 
        content: `❌ Failed to deduct bonus: ${error.message}`,
        ephemeral: true 
      });
    }
  }
};

// Bonus paid command
const bonuspaidCommand = {
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
  async execute(interaction) {
    console.log(`⚡ Executing /bonuspaid command by ${interaction.user.tag}`);
    
    if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      console.log('⛔ User lacks permissions for this command');
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }
    
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      const bonus = await updateBonus(user.id, user.username, amount, 'paid', reason);
      console.log(`✅ Marked $${amount} as paid for ${user.username}`);
      
      // Send DM to user
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
        console.log(`📩 Sent payment DM to ${user.username}`);
      } catch (dmError) {
        console.log(`⚠️ Failed to send DM to ${user.username}:`, dmError);
      }
      
      await interaction.reply({ 
        content: `✅ Marked $${amount} as paid for ${user.username}`,
        ephemeral: true 
      });
    } catch (error) {
      console.error('❌ Bonus Paid Error:', error);
      await interaction.reply({ 
        content: `❌ Failed to mark bonus as paid: ${error.message}`,
        ephemeral: true 
      });
    }
  }
};

// List bonus command
const listbonusCommand = {
  data: new SlashCommandBuilder()
    .setName('listbonus')
    .setDescription('List all bonus records'),
  async execute(interaction) {
    console.log(`⚡ Executing /listbonus command by ${interaction.user.tag}`);
    
    if (!CONFIG.ADMIN_ROLE_IDS.some(roleId => interaction.member.roles.cache.has(roleId))) {
      console.log('⛔ User lacks permissions for this command');
      return interaction.reply({ content: '⛔ You lack permissions for this command.', ephemeral: true });
    }
    
    try {
      const bonuses = await Bonus.find().sort({ outstanding: -1, username: 1 });
      console.log(`📊 Found ${bonuses.length} bonus records`);
      
      if (bonuses.length === 0) {
        console.log('ℹ️ No bonus records found');
        return interaction.reply({ content: 'No bonus records found.', ephemeral: true });
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('💰 Bonus Summary')
        .setDescription(`Total members with bonuses: ${bonuses.length}`)
        .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });
      
      // Split into chunks of 25 fields (Discord limit)
      const chunks = [];
      for (let i = 0; i < bonuses.length; i += 25) {
        chunks.push(bonuses.slice(i, i + 25));
      }
      
      // Add first chunk
      chunks[0].forEach(bonus => {
        embed.addFields({
          name: bonus.username,
          value: `Total: $${bonus.totalBonus}\nPaid: $${bonus.paid}\nOutstanding: $${bonus.outstanding}`,
          inline: true
        });
      });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      console.log('📄 Sent bonus summary');
      
      // Add additional chunks if needed
      for (let i = 1; i < chunks.length; i++) {
        const additionalEmbed = new EmbedBuilder().setColor(0x0099FF);
        chunks[i].forEach(bonus => {
          additionalEmbed.addFields({
            name: bonus.username,
            value: `Total: $${bonus.totalBonus}\nPaid: $${bonus.paid}\nOutstanding: $${bonus.outstanding}`,
            inline: true
          });
        });
        await interaction.followUp({ embeds: [additionalEmbed], ephemeral: true });
        console.log(`📄 Sent bonus summary part ${i + 1}`);
      }
    } catch (error) {
      console.error('❌ List Bonus Error:', error);
      await interaction.reply({ 
        content: '❌ Failed to retrieve bonus records',
        ephemeral: true 
      });
    }
  }
};

// Help command for bonus
const bonushelpCommand = {
  data: new SlashCommandBuilder()
    .setName('bonushelp')
    .setDescription('Show bonus commands help'),
  async execute(interaction) {
    console.log(`⚡ Executing /bonushelp command by ${interaction.user.tag}`);
    
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🆘 Bonus Commands Help')
      .setDescription('Commands to manage the bonus system')
      .addFields(
        { name: '/addbonus', value: 'Add bonus to a user\nUsage: /addbonus @user amount [reason]' },
        { name: '/lessbonus', value: 'Deduct bonus from a user\nUsage: /lessbonus @user amount [reason]' },
        { name: '/bonuspaid', value: 'Mark bonus as paid\nUsage: /bonuspaid @user amount [reason]' },
        { name: '/listbonus', value: 'List all bonus records' }
      );
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    console.log('📄 Sent bonus help');
  }
};

console.log('✅ All bonus commands initialized');

module.exports = {
  addbonusCommand,
  lessbonusCommand,
  bonuspaidCommand,
  listbonusCommand,
  bonushelpCommand,
  EVENT_BONUS_CONFIG,
  INELIGIBLE_ROLES,
  updateBonus
};
