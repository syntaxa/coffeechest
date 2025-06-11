const { logInfo, logError } = require('./logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const botConfig = require('../config');

async function generateHaiku() {
  const genAI = new GoogleGenerativeAI(botConfig.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: botConfig.GEMINI_MODEL_NAME,
    generationConfig: {
      temperature: botConfig.GEMINI_TEMPERATURE,
      maxOutputTokens: botConfig.GEMINI_MAX_OUTPUT_TOKENS,
    },
  });

  try {
    const result = await model.generateContent(botConfig.GEMINI_PROMPT);
    const response = await result.response;
    return response.text();
  } catch (error) {
    logError('Error generating haiku:', error);
    return null;
  }
}

async function generateHaikuWithRetry(retries = 1) {
  let haiku = await generateHaiku();
  if (haiku) {
    return haiku;
  }

  if (retries > 0) {
    logInfo('Retrying haiku generation...');
    return generateHaikuWithRetry(retries - 1);
  }

  return null;
}

module.exports = {
  generateHaikuWithRetry,
};