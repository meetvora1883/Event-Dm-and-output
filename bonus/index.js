const { BonusRecord, BONUS_CONFIG } = require('./bonus.js');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { formatDate } = require('../index'); // Import from main file

// Record bonus for attendance
async function recordAttendanceBonus(eventName, date, userId, username) {
  const bonusType = getBonusType(eventName);
  let amount = 0;
  
  if (bonusType === 'fixed') {
    amount = BONUS_CONFIG.FIXED_BONUS[eventName] || 0;
  }
  
  if (amount > 0) {
    const record = new BonusRecord({
      userId,
      username,
      eventName,
      date,
      bonusType: 'fixed',
      amount
    });
    
    await record.save();
    return amount;
  }
  
  return 0;
}

// Get bonus type for an event
function getBonusType(eventName) {
  if (BONUS_CONFIG.FIXED_BONUS[eventName]) return 'fixed';
  if (BONUS_CONFIG.PER_KILL_BONUS[eventName]) return 'kill';
  if (BONUS_CONFIG.PER_PARACHUTE_BONUS[eventName]) return 'parachute';
  return 'none';
}

// Get user bonus summary
async function getUserBonusSummary(userId) {
  const records = await BonusRecord.find({ userId });
  
  let total = 0;
  let paid = 0;
  let outstanding = 0;
  
  records.forEach(record => {
    total += record.amount;
    if (record.paid) {
      paid += record.amount;
    } else {
      outstanding += record.amount;
    }
  });
  
  return { total, paid, outstanding };
}

// Add bonus manually
async function addBonus(userId, username, amount, reason) {
  const record = new BonusRecord({
    userId,
    username,
    eventName: reason || 'Manual Adjustment',
    date: formatDate(new Date()),
    bonusType: 'manual',
    amount
  });
  
  await record.save();
  return record;
}

// Reduce bonus manually
async function reduceBonus(userId, username, amount, reason) {
  const record = new BonusRecord({
    userId,
    username,
    eventName: reason || 'Manual Deduction',
    date: formatDate(new Date()),
    bonusType: 'manual',
    amount: -Math.abs(amount)
  });
  
  await record.save();
  return record;
}

// Mark bonus as paid
async function markBonusPaid(userId, amount) {
  const records = await BonusRecord.find({ userId, paid: false }).sort({ timestamp: 1 });
  
  let remaining = amount;
  const updatedRecords = [];
  
  for (const record of records) {
    if (remaining <= 0) break;
    
    const toMark = Math.min(record.amount, remaining);
    record.amount -= toMark;
    remaining -= toMark;
    
    if (record.amount <= 0) {
      record.paid = true;
    }
    
    await record.save();
    updatedRecords.push(record);
  }
  
  return updatedRecords;
}

// Get all bonus records
async function getAllBonusRecords() {
  return BonusRecord.aggregate([
    {
      $group: {
        _id: "$userId",
        username: { $first: "$username" },
        totalBonus: { $sum: "$amount" },
        paidBonus: { 
          $sum: { 
            $cond: [{ $eq: ["$paid", true] }, "$amount", 0] 
          } 
        },
        outstandingBonus: { 
          $sum: { 
            $cond: [{ $eq: ["$paid", false] }, "$amount", 0] 
          } 
        }
      }
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        username: 1,
        totalBonus: 1,
        paidBonus: 1,
        outstandingBonus: 1
      }
    },
    { $sort: { outstandingBonus: -1 } }
  ]);
}

// Record kills for an event
async function recordKills(userId, username, eventName, date, kills) {
  const rate = BONUS_CONFIG.PER_KILL_BONUS[eventName];
  if (!rate) throw new Error('This event does not support kill bonuses');
  
  const amount = kills * rate;
  
  const record = new BonusRecord({
    userId,
    username,
    eventName,
    date,
    bonusType: 'kill',
    amount,
    kills
  });
  
  await record.save();
  return record;
}

// Record parachutes for an event
async function recordParachutes(userId, username, eventName, date, parachutes) {
  const rate = BONUS_CONFIG.PER_PARACHUTE_BONUS[eventName];
  if (!rate) throw new Error('This event does not support parachute bonuses');
  
  const amount = parachutes * rate;
  
  const record = new BonusRecord({
    userId,
    username,
    eventName,
    date,
    bonusType: 'parachute',
    amount,
    parachutes
  });
  
  await record.save();
  return record;
}

module.exports = {
  recordAttendanceBonus,
  getUserBonusSummary,
  addBonus,
  reduceBonus,
  markBonusPaid,
  getAllBonusRecords,
  recordKills,
  recordParachutes,
  getBonusType
};
