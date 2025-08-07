const mongoose = require('mongoose');

// Bonus Schema
const bonusSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  bonuses: [{
    eventName: String,
    date: String,
    type: String, // 'kill', 'parachute', 'custom'
    count: Number,
    amount: Number,
    bonusPerUnit: Number,
    paid: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
  }],
  totalBonus: { type: Number, default: 0 },
  paidBonus: { type: Number, default: 0 },
  outstandingBonus: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const Bonus = mongoose.model('Bonus', bonusSchema);

// Event bonus configurations
const EVENT_BONUSES = {
  "Family raid (Attack)": { type: 'custom', amount: 15000 },
  "Family raid (Protection)": { type: 'custom', amount: 5000 },
  "State Object": { type: 'custom', amount: 8000 },
  "Store robbery": { type: 'custom', amount: 15000 },
  "Attacking Prison": { type: 'custom', amount: 10000 },
  "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)": { type: 'parachute', amount: 25000 },
  "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪": { type: 'kill', amount: 25000 },
  "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓": { type: 'custom', amount: 8000 },
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤": { type: 'custom', amount: 300000 },
  "𝔽𝕠𝕦𝕟𝕕𝕣𝕪": { type: 'kill', amount: 20000 },
  "𝕄𝕒𝕝𝕝": { type: 'custom', amount: 75000 },
  "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣": { type: 'kill', amount: 80000 },
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕": { type: 'custom', amount: 20000 },
  "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)": { type: 'custom', amount: 10000 },
  "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖": { type: 'kill', amount: 20000 },
  "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)": { type: 'parachute', amount: 50000 },
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪": { type: 'custom', amount: 35000 },
  "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣": { type: 'kill', amount: 20000 },
  "Informal (Battle for business for unofficial organization)": { type: 'kill', amount: 50000 }
};

// Check if user is eligible for bonus (not founder/co-founder/high command)
function isEligibleForBonus(member, excludedRoles) {
  return !excludedRoles.some(roleId => member.roles.cache.has(roleId));
}

// Calculate bonus for a user
async function calculateBonus(userId, username, eventName, date, type, count = 1) {
  const eventBonus = EVENT_BONUSES[eventName];
  if (!eventBonus) return null;

  let amount = 0;
  if (eventBonus.type === 'custom') {
    amount = eventBonus.amount;
  } else {
    amount = eventBonus.amount * count;
  }

  const bonusData = {
    eventName,
    date,
    type: eventBonus.type,
    count,
    amount,
    bonusPerUnit: eventBonus.amount,
    paid: false
  };

  // Update or create bonus record
  let bonusRecord = await Bonus.findOne({ userId });
  if (!bonusRecord) {
    bonusRecord = new Bonus({
      userId,
      username,
      bonuses: [bonusData],
      totalBonus: amount,
      outstandingBonus: amount
    });
  } else {
    bonusRecord.bonuses.push(bonusData);
    bonusRecord.totalBonus += amount;
    bonusRecord.outstandingBonus += amount;
    bonusRecord.lastUpdated = new Date();
  }

  await bonusRecord.save();
  return bonusRecord;
}

// Add custom bonus
async function addCustomBonus(userId, username, amount, description) {
  const bonusData = {
    eventName: description || 'Custom Bonus',
    date: new Date().toLocaleDateString('en-GB'),
    type: 'custom',
    count: 1,
    amount,
    bonusPerUnit: amount,
    paid: false
  };

  let bonusRecord = await Bonus.findOne({ userId });
  if (!bonusRecord) {
    bonusRecord = new Bonus({
      userId,
      username,
      bonuses: [bonusData],
      totalBonus: amount,
      outstandingBonus: amount
    });
  } else {
    bonusRecord.bonuses.push(bonusData);
    bonusRecord.totalBonus += amount;
    bonusRecord.outstandingBonus += amount;
    bonusRecord.lastUpdated = new Date();
  }

  await bonusRecord.save();
  return bonusRecord;
}

// Less bonus
async function lessBonus(userId, username, amount, description) {
  const bonusData = {
    eventName: description || 'Bonus Deduction',
    date: new Date().toLocaleDateString('en-GB'),
    type: 'custom',
    count: 1,
    amount: -amount,
    bonusPerUnit: -amount,
    paid: false
  };

  let bonusRecord = await Bonus.findOne({ userId });
  if (!bonusRecord) {
    bonusRecord = new Bonus({
      userId,
      username,
      bonuses: [bonusData],
      totalBonus: -amount,
      outstandingBonus: -amount
    });
  } else {
    bonusRecord.bonuses.push(bonusData);
    bonusRecord.totalBonus -= amount;
    bonusRecord.outstandingBonus -= amount;
    bonusRecord.lastUpdated = new Date();
  }

  await bonusRecord.save();
  return bonusRecord;
}

// Mark bonus as paid
async function markBonusAsPaid(userId, amount) {
  const bonusRecord = await Bonus.findOne({ userId });
  if (!bonusRecord) return null;

  const amountToPay = Math.min(amount, bonusRecord.outstandingBonus);
  bonusRecord.paidBonus += amountToPay;
  bonusRecord.outstandingBonus -= amountToPay;
  bonusRecord.lastUpdated = new Date();

  // Mark individual bonuses as paid (oldest first)
  let remaining = amountToPay;
  for (const bonus of bonusRecord.bonuses.sort((a, b) => a.timestamp - b.timestamp)) {
    if (remaining <= 0) break;
    if (!bonus.paid) {
      const toPay = Math.min(remaining, bonus.amount);
      bonus.paid = true;
      remaining -= toPay;
    }
  }

  await bonusRecord.save();
  return bonusRecord;
}

// Get bonus summary
async function getBonusSummary(userId) {
  return await Bonus.findOne({ userId });
}

// Get all bonuses
async function getAllBonuses() {
  return await Bonus.find({});
}

// Get outstanding bonuses
async function getOutstandingBonuses() {
  return await Bonus.find({ outstandingBonus: { $gt: 0 } });
}

module.exports = {
  EVENT_BONUSES,
  isEligibleForBonus,
  calculateBonus,
  addCustomBonus,
  lessBonus,
  markBonusAsPaid,
  getBonusSummary,
  getAllBonuses,
  getOutstandingBonuses
};
