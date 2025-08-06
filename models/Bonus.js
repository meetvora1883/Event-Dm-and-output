const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  eventName: String,
  date: String,
  userId: String,
  username: String,
  timestamp: { type: Date, default: Date.now },
  actionCount: Number
});

module.exports = mongoose.model('Attendance', attendanceSchema);
