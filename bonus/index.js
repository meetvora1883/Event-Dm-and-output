const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Bonus = require('./bonus');

// Bonus amounts for each event
const BONUS_RULES = {
  "Family raid (Attack)": { type: 'fixed', amount: 15000 },
  "Family raid (Protection)": { type: 'fixed', amount: 5000 },
  "State Object": { type: 'fixed', amount: 8000 },
  "Turf": { type: 'fixed', amount: 0 }, // Add amount if needed
  "Store robbery": { type: 'fixed', amount: 15000 },
  "Caravan delivery": { type: 'fixed', amount: 0 }, // Add amount if needed
  "Attacking Prison": { type: 'fixed', amount: 10000 },
  "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)": { type: 'parachute', amount: 25000 },
  "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪": { type: 'kill', amount: 25000 },
  "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: 'fixed', amount: 8000 },
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤": { type: 'fixed', amount: 300000 },
  "𝔽𝕠𝕦𝕟𝕕𝕣𝕪": { type: 'kill', amount: 20000 },
  "𝕄𝕒𝕝𝕝": { type: 'fixed', amount: 75000 },
  "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣": { type: 'kill', amount: 80000 },
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕": { type: 'fixed', amount: 20000 },
  "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)": { type: 'fixed', amount: 10000 },
  "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'fixed', amount: 0 }, // Add amount if needed
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤": { type: 'fixed', amount: 0 }, // Add amount if needed
  "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖": { type: 'kill', amount: 20000 },
  "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'parachute', amount: 50000 },
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪": { type: 'fixed', amount: 35000 },
  "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣": { type: 'kill', amount: 20000 },
  "Family War": { type: 'fixed', amount: 0 }, // Add amount if needed
  "Money Printing Machine": { type: 'fixed', amount: 0 }, // Add amount if needed
  "Informal (Battle for business for unofficial organization)": { type: 'kill', amount: 50000 }
};

// Ineligible roles (founder, co-founder, high command)
const INELIGIBLE_ROLES = ['1398888612388540538', '1398888612388540537', '1398888612388540536'];

async function calculateBonus(eventName, userId, guild, kills = 0, parachutes = 0) {
  const eventRule = BONUS_RULES[eventName];
  if (!eventRule) return 0;

  // Check if user has ineligible role
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return 0;

  const hasIneligibleRole = member.roles.cache.some(role => 
    INELIGIBLE_ROLES.includes(role.id)
  );
  if (hasIneligibleRole) return 0;

  // Calculate bonus based on type
  switch (eventRule.type) {
    case 'fixed':
      return eventRule.amount;
    case 'kill':
      return kills * eventRule.amount;
    case 'parachute':
      return parachutes * eventRule.amount;
    default:
      return 0;
  }
}

async function getUserBonusSummary(userId) {
  const bonuses = await Bonus.find({ userId }).sort({ date: -1 });
  
  let total = 0;
  let paid = 0;
  let outstanding = 0;
  
  bonuses.forEach(bonus => {
    total += bonus.amount;
    if (bonus.paid) {
      paid += bonus.amount;
    } else {
      outstanding += bonus.amount;
    }
  });
  
  return { total, paid, outstanding, bonuses };
}

async function getAllBonuses() {
  const bonuses = await Bonus.aggregate([
    {
      $group: {
        _id: "$userId",
        username: { $first: "$username" },
        total: { $sum: "$amount" },
        paid: { $sum: { $cond: [{ $eq: ["$paid", true] }, "$amount", 0] } },
        outstanding: { $sum: { $cond: [{ $eq: ["$paid", false] }, "$amount", 0] } }
      }
    },
    { $sort: { outstanding: -1 } }
  ]);
  
  return bonuses;
}

async function sendBonusDM(user, eventName, date, bonusAmount, previousSummary) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('💰 Event Bonus Information')
      .setDescription('Here are your bonus details:')
      .addFields(
        { name: '📌 Event', value: eventName, inline: true },
        { name: '📅 Date', value: date, inline: true },
        { name: '💸 Bonus Earned', value: `$${bonusAmount.toLocaleString()}`, inline: true },
        { name: '💰 Total Bonus', value: `$${previousSummary.total.toLocaleString()}`, inline: true },
        { name: '💳 Paid', value: `$${previousSummary.paid.toLocaleString()}`, inline: true },
        { name: '🔄 Outstanding', value: `$${previousSummary.outstanding.toLocaleString()}`, inline: true }
      )
      .setFooter({ text: 'Thank you for participating in family events!' });
    
    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`Failed to send DM to ${user.username}:`, error);
    return false;
  }
}

async function addBonus(userId, username, amount, reason, paid = false) {
  const bonus = new Bonus({
    userId,
    username,
    amount,
    reason,
    paid,
    date: new Date()
  });
  
  await bonus.save();
  return bonus;
}

async function markAsPaid(userId, amount) {
  // Find outstanding bonuses (oldest first)
  const outstanding = await Bonus.find({ 
    userId, 
    paid: false 
  }).sort({ date: 1 });
  
  let remaining = amount;
  const updatedBonuses = [];
  
  for (const bonus of outstanding) {
    if (remaining <= 0) break;
    
    const toPay = Math.min(bonus.amount, remaining);
    if (toPay === bonus.amount) {
      // Mark entire bonus as paid
      bonus.paid = true;
      await bonus.save();
      updatedBonuses.push(bonus);
      remaining -= toPay;
    } else {
      // Split the bonus
      const newBonus = new Bonus({
        userId: bonus.userId,
        username: bonus.username,
        amount: bonus.amount - toPay,
        reason: bonus.reason,
        paid: false,
        date: bonus.date
      });
      
      bonus.amount = toPay;
      bonus.paid = true;
      
      await Promise.all([bonus.save(), newBonus.save()]);
      updatedBonuses.push(bonus);
      remaining -= toPay;
    }
  }
  
  return { updatedBonuses, remaining };
}

module.exports = {
  BONUS_RULES,
  calculateBonus,
  getUserBonusSummary,
  getAllBonuses,
  sendBonusDM,
  addBonus,
  markAsPaid
};
