// config.js
require('dotenv').config();

const botConfig = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    MONGODB_URI: process.env.MONGODB_URI,
    SCHEDULED_TIME: process.env.SCHEDULED_TIME || '10:00',
    TIMEZONE: process.env.TIMEZONE || 'Europe/Moscow',
    WIN_MESSAGE: process.env.WIN_MESSAGE || 'Поздравляю! Тебе выпало кофечко сегодня! 🎉',
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_API_URL: process.env.LLM_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    LLM_MODEL_NAME: process.env.LLM_MODEL_NAME || 'google/gemini-3-flash-preview',
    LLM_TEMPERATURE: parseFloat(process.env.LLM_TEMPERATURE) || 1.8,
    LLM_MAX_OUTPUT_TOKENS: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS, 10) || 300,
    LLM_PROMPT: process.env.LLM_PROMPT || "Придумай две темы, связанные с природой. Напиши хайку на русском языке в классическом стиле, с образной, метафорической связностью, без юмора. Главная тема это кофе, но также добавь к контексту темы, придуманные ранее. Хайку должно отражать атмосферу спокойствия, тепла и утреннего настроения, как в традиционной японской поэзии. Обязательно затронь тему кофе. в ответе не должно быть тем, а должно быть только текст хайку. очень важно: проверь ответ и убери из него список тем, заголовок и всё, что не является текстом хайку. ответь с текстом только одного хайку.",
    ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
    ENVIRONMENT: process.env.ENVIRONMENT || 'PROD'
};

module.exports = botConfig;
