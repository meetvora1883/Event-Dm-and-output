const mongoose = require('mongoose');

// Bonus Configuration
const BONUS_CONFIG = {
  // Fixed bonus events
  FIXED_BONUS: {
    "Family raid (Attack)": 15000,
    "Family raid (Protection)": 5000,
    "Drug Lab": 8000,
    "State Object": 8000,
    "Store robbery": 15000,
    "Attacking Prison": 10000,
    "RP Ticket Factory": 300000,
    "Vineyard": 20000,
    "Shopping Center": 75000,
    "Bank Robbery": 35000
  },
  
  // Per-kill bonus events
  PER_KILL_BONUS: {
    "Weapons Factory": 25000,
    "Business War": 80000,
    "Hotel Takeover": 20000,
    "Rating Battle": 20000,
    "Capture of Foundry": 20000,
    "Informal": 50000
  },
  
  // Per-parachute bonus events
  PER_PARACHUTE_BONUS: {
    "Aircraft Carrier": 50000,
    "Harbor Event": 25000
  },
  
  // Special case events
  SPECIAL_BONUS: {
    "Family War": { type: 'fixed', amount: 0 }, // No fixed bonus
    "Money Printing Machine": { type: 'fixed', amount: 0 }
  }
};

// Bonus Record Schema
const bonusRecordSchema = new mongoose.Schema({
  userId: String,
  username: String,
  eventName: String,
  date: String, // DD/MM/YYYY format
  bonusType: String, // 'fixed', 'kill', 'parachute', 'manual'
  amount: Number,
  kills: { type: Number, default: 0 },
  parachutes: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const BonusRecord = mongoose.model('BonusRecord', bonusRecordSchema);

module.exports = {
  BONUS_CONFIG,
  BonusRecord
};
