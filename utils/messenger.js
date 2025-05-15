const { logInfo, logError } = require('../utils/logger');
const bot = require('../bot'); // Assuming bot.js is in the root directory
const User = require('../models/User'); // Assuming models/User.js is in the models directory

/**
 * Sends a message to a specific user.
 * @param {string} telegramId - The Telegram ID of the user.
 * @param {string} message - The message content to send.
 */
async function sendToUser(telegramId, message) {
  try {
    await bot.sendMessage(telegramId, message);
    logInfo(`Message sent to user ${telegramId}`);
  } catch (error) {
    logError(`Error sending message to user ${telegramId}:`, error.message);
    // Optional: Add more specific error handling if needed
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

    for (const user of users) {
      try {
        await bot.sendMessage(user.telegramId, message);
        logInfo(`Broadcast message sent to user ${user.telegramId}`);
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
  sendToUser,
  broadcastToUsers
};