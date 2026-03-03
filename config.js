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
    GEMINI_PROMPT: "Придумай две темы, связанные с природой. Напиши хайку на русском языке в классическом стиле, с образной, метафорической связностью, без юмора. Главная тема это кофе, но также добавь к контексту темы, придуманные ранее. Хайку должно отражать атмосферу спокойствия, тепла и утреннего настроения, как в традиционной японской поэзии. Обязательно затронь тему кофе. в ответе не должно быть тем, а должно быть только текст хайку. очень важно: проверь ответ и убери из него список тем. оставь только хайку.",
    ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
    ENVIRONMENT: process.env.ENVIRONMENT || 'PROD',
    TESTING_CHAT_ID: process.env.TESTING_CHAT_ID
};

module.exports = botConfig;
