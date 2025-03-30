const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  username: String,
  registeredAt: {
    type: Date,
    default: Date.now
  },
  notificationTime: {
    type: String,
    default: '09:50'
  },
  timeZone: {
    type: String,
    default: 'Europe/Moscow'
  },
  pendingTimezone: {
    type: Boolean,
    default: false
  }
});

userSchema.set('strict', false);
userSchema.set('strictQuery', false);

module.exports = mongoose.model('User', userSchema);