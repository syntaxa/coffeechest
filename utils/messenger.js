require('dotenv').config();

const { logInfo, logError } = require('../utils/logger');
const bot = require('../bot'); // Assuming bot.js is in the root directory
const User = require('../models/User'); // Assuming models/User.js is in the models directory

const ENVIRONMENT = process.env.ENVIRONMENT;
const TESTING_USER_ID = process.env.TESTING_USER_ID;

/**
 * Sends a message conditionally based on environment and testing user ID.
 * @param {string} telegramId - The Telegram ID of the user.
 * @param {string} message - The message content to send.
 */
async function safeSendMessage(telegramId, message) {
  if (ENVIRONMENT === 'PROD') {
    // In production, send message to all users
    try {
      await bot.sendMessage(telegramId, message);
      logInfo(`Message sent to user ${telegramId} in PROD environment.`);
    } catch (error) {
      logError(`Error sending message to user ${telegramId} in PROD environment:`, error.message);
    }
  } else if (ENVIRONMENT === 'TEST') {
    // In test, only send message to the testing user
    if (telegramId === TESTING_USER_ID) {
      try {
        await bot.sendMessage(telegramId, message);
        logInfo(`Message sent to testing user ${telegramId} in TEST environment.`);
      } catch (error) {
        logError(`Error sending message to testing user ${telegramId} in TEST environment:`, error.message);
      }
    } else {
      logInfo(`Message suppressed for non-testing user ${telegramId} in TEST environment.`);
    }
  } else {
    logError(`Unknown ENVIRONMENT: ${ENVIRONMENT}. Message not sent to ${telegramId}.`);
  }
}
const { logInfo, logError } = require('../utils/logger');
const bot = require('../bot'); // Assuming bot.js is in the root directory
const User = require('../models/User'); // Assuming models/User.js is in the models directory

/**
 * Sends a message to a specific user.
 * @param {string} telegramId - The Telegram ID of the user.
 * @param {string} message - The message content to send.
 */
/**
 * Broadcasts a message to all registered users.
 * Handles users who have blocked the bot.
 * @param {string} message - The message content to broadcast.
 */
async function broadcastToUsers(message) {
  try {
    const users = await User.find();
    logInfo(`Broadcasting message to ${users.length} users.`);

    for (const user of users) {
      try {
        await safeSendMessage(user.telegramId, message);
      } catch (error) {
        if ((error.response) && (error.response.statusCode === 403)) {
          // User has blocked the bot, delete them from the database
          await User.deleteOne({ telegramId: user.telegramId });
          logInfo(`User ${user.username} (${user.telegramId}) was blocked and unregistered during broadcast.`);
        } else {
          logError(`Error sending broadcast message to ${user.telegramId}:`, error.message);
        }
      }
    }
    logInfo('Broadcast complete.');
  } catch (error) {
    logError('Error during broadcast:', error);
  }
}

module.exports = {
  broadcastToUsers,
  safeSendMessage
};