const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },
  paid: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  eventName: String,
  kills: { type: Number, default: 0 },
  parachutes: { type: Number, default: 0 }
});

const Bonus = mongoose.model('Bonus', bonusSchema);

module.exports = Bonus;
