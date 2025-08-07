// models/eventData.js

const mongoose = require('mongoose');

const eventDataSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    eventName: { type: String, required: true },
    date: { type: String, required: true }, // Using DD/MM/YYYY format
    count: { type: Number, default: 0 },
    type: { type: String, enum: ['kills', 'parachutes'], required: true }
}, {
    // Automatically delete documents after 24 hours
    expireAfterSeconds: 86400
});

// Create a compound index for efficient lookups
eventDataSchema.index({ userId: 1, eventName: 1, date: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('EventData', eventDataSchema);
