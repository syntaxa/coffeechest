require('dotenv').config();

const { logInfo, logError } = require('../utils/logger');
const config = require('../config');
let telegramBotInstance;

function initMessenger(botInstance) {
  telegramBotInstance = botInstance;
}
const User = require('../models/User'); // Assuming models/User.js is in the models directory

/**
 * Checks if a user is an administrator
 * @param {string} telegramId - The Telegram chat ID of the user to check
 * @returns {boolean} - True if the user is an admin, false otherwise
 */
function isAdmin(telegramId) {
  return telegramId == config.ADMIN_CHAT_ID;
}

/**
 * Sends a message conditionally based on environment and testing user ID.
 * @param {string} telegramId - The Telegram ID of the user.
 * @param {string} message - The message content to send.
 */
async function safeSendMessage(telegramId, message, options) {
  if (config.ENVIRONMENT === 'PROD') {
    // In production, send message to all users
    try {
      if (!telegramBotInstance) {
        logError('Messenger not initialized with bot instance.');
        return;
      }
      await telegramBotInstance.sendMessage(telegramId, message, options);
    } catch (error) {
      // Re-throw 403 errors so they can be handled by the caller (user blocked the bot)
      if (error.response && error.response.statusCode === 403) {
        throw error;
      }
      logError(`Error sending message to user ${telegramId} in PROD environment:`, error.message);
    }
  } else if (config.ENVIRONMENT === 'TEST') {
    // In test, only send message to the testing user
    if (telegramId == config.TESTING_CHAT_ID) {
      try {
        if (!telegramBotInstance) {
          logError('Messenger not initialized with bot instance.');
          return;
        }
        await telegramBotInstance.sendMessage(telegramId, message, options);
      } catch (error) {
        // Re-throw 403 errors so they can be handled by the caller (user blocked the bot)
        if (error.response && error.response.statusCode === 403) {
          throw error;
        }
        logError(`Error sending message to testing user ${telegramId} in TEST environment:`, error.message);
      }
    } else {
      logInfo(`Message suppressed for non-testing user ${telegramId} in TEST environment.`);
    }
  } else {
    logError(`Unknown ENVIRONMENT: ${config.ENVIRONMENT}. Message not sent to ${telegramId}.`);
  }
}


/**
 * Broadcasts a message to all registered users.
 * Handles users who have blocked the bot.
 * @param {string} message - The message content to broadcast.
 */
async function broadcastToUsers(message) {
  try {
    const users = await User.find();
    logInfo(`Broadcasting message to ${users.length} users.`);
    let successfulSends = 0;

    for (const user of users) {
      try {
        await safeSendMessage(user.telegramId, message);
        successfulSends++;
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
    logInfo(`Broadcast complete. Successfully sent to ${successfulSends} users.`);
    return successfulSends;
  } catch (error) {
    logError('Error during broadcast:', error);
    throw error;
  }
}

module.exports = {
  initMessenger,
  broadcastToUsers,
  safeSendMessage,
  isAdmin
};