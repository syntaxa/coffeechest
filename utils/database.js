const { logInfo, logError } = require('./logger');
const mongoose = require('mongoose');
const botConfig = require('../config');

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    await mongoose.connect(botConfig.MONGODB_URI);
    logInfo('MongoDB connected successfully');
  } catch (error) {
    logError('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };