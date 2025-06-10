// config.js
require('dotenv').config();

const botConfig = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    MONGODB_URI: process.env.MONGODB_URI,
    SCHEDULED_TIME: process.env.SCHEDULED_TIME || '10:00',
    TIMEZONE: process.env.TIMEZONE || 'Europe/Moscow',
    WIN_MESSAGE: process.env.WIN_MESSAGE || 'Поздравляю! Тебе выпало кофечко сегодня! 🎉',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL_NAME: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash',
    GEMINI_TEMPERATURE: parseFloat(process.env.GEMINI_TEMPERATURE) || 1.5,
    GEMINI_MAX_OUTPUT_TOKENS: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 300,
    GEMINI_PROMPT: "придумай три темы для стихов. придумай один стих в стиле хайку про кофе с тонким юмором и используй придуманные ранее темы для вдохновения. ответ должен содержать только текст хайку. убери темы из результата.",
    ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID
};

module.exports = botConfig;