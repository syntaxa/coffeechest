const { GoogleGenerativeAI } = require('@google/generative-ai');
const botConfig = require('../config');

async function generateHaiku(prompt, temperature, maxOutputTokens) {
  const genAI = new GoogleGenerativeAI(botConfig.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: botConfig.GEMINI_MODEL_NAME,
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: maxOutputTokens,
    },
  });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating haiku:', error);
    return null;
  }
}

async function generateHaikuWithRetry(prompt, temperature, maxOutputTokens, retries = 1) {
  let haiku = await generateHaiku(prompt, temperature, maxOutputTokens);
  if (haiku) {
    return haiku;
  }

  if (retries > 0) {
    console.log('Retrying haiku generation...');
    return generateHaikuWithRetry(prompt, temperature, maxOutputTokens, retries - 1);
  }

  return null;
}

module.exports = {
  generateHaikuWithRetry,
};