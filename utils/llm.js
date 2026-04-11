const { logInfo, logError } = require('./logger');
const botConfig = require('../config');

function extractTextFromChoice(choice) {
  const content = choice?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
}

async function generateHaiku() {
  if (!botConfig.LLM_API_KEY) {
    logError('LLM_API_KEY is not configured.');
    return null;
  }

  try {
    const response = await fetch(botConfig.LLM_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botConfig.LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: botConfig.LLM_MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: botConfig.LLM_PROMPT
          }
        ],
        temperature: botConfig.LLM_TEMPERATURE,
        max_completion_tokens: botConfig.LLM_MAX_OUTPUT_TOKENS
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || `HTTP ${response.status}`;
      logError(`Error generating haiku via LLM provider: ${errorMessage}`);
      return null;
    }

    const text = extractTextFromChoice(data?.choices?.[0]);
    return text || null;
  } catch (error) {
    logError('Error generating haiku via LLM provider:', error);
    return null;
  }
}

async function generateHaikuWithRetry(retries = 1) {
  const haiku = await generateHaiku();
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
  generateHaikuWithRetry
};
