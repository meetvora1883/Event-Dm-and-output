const { EmbedBuilder } = require('discord.js');
const bonusData = require('./bonus.js');
const fs = require('fs');
const path = require('path');

// Bonus amounts per event
const BONUS_AMOUNTS = {
  "Family raid (Attack)": { type: 'fixed', amount: 15000 },
  "Family raid (Protection)": { type: 'fixed', amount: 5000 },
  "State Object": { type: 'fixed', amount: 8000 },
  "Turf": { type: 'fixed', amount: 0 }, // No bonus specified
  "Store robbery": { type: 'fixed', amount: 15000 },
  "Caravan delivery": { type: 'fixed', amount: 0 },
  "Attacking Prison": { type: 'fixed', amount: 10000 },
  "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)": { type: 'parachute', amount: 25000 },
  "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪": { type: 'kill', amount: 25000 },
  "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: 'fixed', amount: 8000 },
  "𝔽�𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔�𝕖𝕥𝕤": { type: 'fixed', amount: 300000 },
  "𝔽𝕠𝕦𝕟𝕕𝕣𝕪": { type: 'kill', amount: 20000 },
  "𝕄𝕒𝕝𝕝": { type: 'fixed', amount: 75000 },
  "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣": { type: 'kill', amount: 80000 },
  "𝕍𝕚𝕟𝕖𝕪𝕒�𝕣𝕕": { type: 'fixed', amount: 20000 },
  "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)": { type: 'fixed', amount: 10000 },
  "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖�𝕕�𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'fixed', amount: 0 },
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤": { type: 'fixed', amount: 0 },
  "ℝ𝕒𝕥�𝕚𝕟𝕘 𝔹𝕒𝕥𝕥�𝕝𝕖": { type: 'kill', amount: 20000 },
  "𝔸𝕚𝕣𝕔𝕣𝕒�𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'parachute', amount: 50000 },
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓�𝕖𝕣𝕪": { type: 'fixed', amount: 35000 },
  "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣": { type: 'kill', amount: 20000 },
  "Family War": { type: 'fixed', amount: 0 },
  "Money Printing Machine": { type: 'fixed', amount: 0 },
  "Informal (Battle for business for unofficial organization)": { type: 'kill', amount: 50000 }
};

// Roles that are not eligible for bonus
const INELIGIBLE_ROLES = ['founder', 'co founder', 'high command'];

// File path for bonus data
const BONUS_FILE_PATH = path.join(__dirname, 'bonus.js');

// Save bonus data to file
function saveBonusData() {
  fs.writeFileSync(BONUS_FILE_PATH, `module.exports = ${JSON.stringify(bonusData, null, 2)};`);
}

// Initialize bonus data for a user if not exists
function initUserData(userId) {
  if (!bonusData[userId]) {
    bonusData[userId] = {
      totalEarned: 0,
      totalPaid: 0,
      outstanding: 0,
      details: []
    };
  }
}

// Add bonus for a user
function addBonus(userId, amount, eventName, date, killsOrParachutes = 0) {
  initUserData(userId);
  
  const bonusEntry = {
    amount,
    eventName,
    date,
    killsOrParachutes,
    timestamp: new Date().toISOString()
  };
  
  bonusData[userId].totalEarned += amount;
  bonusData[userId].outstanding += amount;
  bonusData[userId].details.push(bonusEntry);
  
  saveBonusData();
}

// Less bonus for a user (manual adjustment)
function lessBonus(userId, amount, reason) {
  initUserData(userId);
  
  const adjustmentEntry = {
    amount: -amount,
    eventName: reason || 'Manual adjustment',
    date: new Date().toLocaleDateString(),
    timestamp: new Date().toISOString()
  };
  
  bonusData[userId].totalEarned = Math.max(0, bonusData[userId].totalEarned - amount);
  bonusData[userId].outstanding = Math.max(0, bonusData[userId].outstanding - amount);
  bonusData[userId].details.push(adjustmentEntry);
  
  saveBonusData();
}

// Mark bonus as paid
function markAsPaid(userId, amount) {
  initUserData(userId);
  
  const paidAmount = Math.min(amount, bonusData[userId].outstanding);
  if (paidAmount <= 0) return 0;
  
  bonusData[userId].totalPaid += paidAmount;
  bonusData[userId].outstanding -= paidAmount;
  
  saveBonusData();
  return paidAmount;
}

// Get user bonus summary
function getUserBonusSummary(userId) {
  initUserData(userId);
  return bonusData[userId];
}

// Get all users bonus data
function getAllBonusData() {
  return bonusData;
}

// Process event bonus
async function processEventBonus(eventName, date, users, interaction) {
  const bonusInfo = BONUS_AMOUNTS[eventName];
  if (!bonusInfo || bonusInfo.amount === 0) return;

  const eligibleUsers = users.filter(user => {
    const member = interaction.guild.members.cache.get(user.id);
    return !member.roles.cache.some(role => 
      INELIGIBLE_ROLES.includes(role.name.toLowerCase())
    );
  });

  if (eligibleUsers.size === 0) return;

  if (bonusInfo.type === 'fixed') {
    eligibleUsers.forEach(user => {
      addBonus(user.id, bonusInfo.amount, eventName, date);
    });
  }
  // For kill/parachute events, we'll handle them separately with /kills and /parachute commands
}

// Generate bonus DM embed
function generateBonusDMEmbed(userId, eventName, date) {
  const userData = getUserBonusSummary(userId);
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('💰 Bonus Information')
    .setDescription('Here are your bonus details:');
  
  if (eventName) {
    const bonusInfo = BONUS_AMOUNTS[eventName];
    if (bonusInfo) {
      embed.addFields(
        { name: '🎯 Current Event', value: eventName, inline: true },
        { name: '📅 Date', value: date, inline: true },
        { name: '💵 Potential Bonus', value: `${bonusInfo.amount}$`, inline: true }
      );
    }
  }
  
  embed.addFields(
    { name: '💰 Total Earned', value: `${userData.totalEarned}$`, inline: true },
    { name: '💸 Total Paid', value: `${userData.totalPaid}$`, inline: true },
    { name: '📊 Outstanding', value: `${userData.outstanding}$`, inline: true }
  );
  
  return embed;
}

// Send bonus DM to user
async function sendBonusDM(user, eventName, date) {
  try {
    const embed = generateBonusDMEmbed(user.id, eventName, date);
    await user.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to send bonus DM to ${user.tag}:`, error);
  }
}

module.exports = {
  BONUS_AMOUNTS,
  INELIGIBLE_ROLES,
  addBonus,
  lessBonus,
  markAsPaid,
  getUserBonusSummary,
  getAllBonusData,
  processEventBonus,
  generateBonusDMEmbed,
  sendBonusDM,
  saveBonusData
};
