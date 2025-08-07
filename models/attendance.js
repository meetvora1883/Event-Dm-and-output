// models/attendance.js

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    date: { type: String, required: true }, // Storing as DD/MM/YYYY string
    userId: { type: String, required: true },
    username: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Add an index for faster queries if you ever need to search by user and event
attendanceSchema.index({ userId: 1, eventName: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
