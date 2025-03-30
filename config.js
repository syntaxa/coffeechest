// config.js
require('dotenv').config();

const botConfig = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    MONGODB_URI: process.env.MONGODB_URI,
    SCHEDULED_TIME: process.env.SCHEDULED_TIME || '10:00',
    TIMEZONE: process.env.TIMEZONE || 'Europe/Moscow',
    WIN_MESSAGE: process.env.WIN_MESSAGE || 'Поздравляю! Тебе выпало кофечко сегодня! 🎉'
};

module.exports = botConfig;