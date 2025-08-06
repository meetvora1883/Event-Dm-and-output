const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: { 
    type: Number, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['add', 'deduct', 'paid'], 
    required: true 
  },
  reason: String,
  event: String,
  date: String,
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const bonusSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  totalBonus: { 
    type: Number, 
    default: 0 
  },
  paid: { 
    type: Number, 
    default: 0 
  },
  outstanding: { 
    type: Number, 
    default: 0 
  },
  transactions: [transactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Bonus', bonusSchema);
