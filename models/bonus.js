// models/bonus.js

const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    totalBonus: { type: Number, default: 0 },
    paidBonus: { type: Number, default: 0 },
    transactions: [{
        type: { type: String, enum: ['earn', 'paid', 'add', 'subtract'], required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }]
});

// Virtual for outstanding bonus
bonusSchema.virtual('outstandingBonus').get(function() {
    return this.totalBonus - this.paidBonus;
});

module.exports = mongoose.model('Bonus', bonusSchema);
