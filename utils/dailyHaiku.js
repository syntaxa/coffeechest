const moment = require('moment-timezone');
const DailyHaiku = require('../models/DailyHaiku');
const { generateHaikuWithRetry } = require('./gemini');
const { logInfo, logError } = require('./logger');

const DEFAULT_WAIT_ATTEMPTS = 6;
const WAIT_INTERVAL_MS = 500;
const STALE_GENERATION_MS = 10 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOwnerToken() {
  return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getUtcDayKey(date = new Date()) {
  return moment.utc(date).format('YYYY-MM-DD');
}

async function waitUntilReady(dayKey, attempts = DEFAULT_WAIT_ATTEMPTS) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const doc = await DailyHaiku.findOne({ dayKey }).lean();
    if (!doc) {
      return null;
    }

    if (doc.status === 'ready' && doc.text) {
      return doc.text;
    }

    if (doc.status === 'failed') {
      return null;
    }

    await sleep(WAIT_INTERVAL_MS);
  }

  return null;
}

async function runGeneration(dayKey, ownerToken) {
  const generatedText = await generateHaikuWithRetry();

  if (!generatedText) {
    await DailyHaiku.findOneAndUpdate(
      { dayKey, status: 'generating', generationOwner: ownerToken },
      {
        $set: {
          status: 'failed',
          generationError: 'Gemini returned empty response'
        },
        $unset: { generationOwner: 1 }
      }
    );
    return null;
  }

  const updated = await DailyHaiku.findOneAndUpdate(
    { dayKey, status: 'generating', generationOwner: ownerToken },
    {
      $set: {
        status: 'ready',
        text: generatedText,
        generatedAt: new Date(),
        generationError: null
      },
      $unset: { generationOwner: 1 }
    },
    { new: true }
  );

  if (!updated) {
    // Another worker replaced the lock; use persisted value if available.
    return waitUntilReady(dayKey);
  }

  return generatedText;
}

async function tryClaimFailed(dayKey, ownerToken) {
  const claimed = await DailyHaiku.findOneAndUpdate(
    { dayKey, status: 'failed' },
    {
      $set: {
        status: 'generating',
        generationOwner: ownerToken,
        generationError: null
      }
    },
    { new: true }
  );

  return Boolean(claimed);
}

async function tryClaimStaleGeneration(dayKey, ownerToken) {
  const staleBefore = new Date(Date.now() - STALE_GENERATION_MS);
  const claimed = await DailyHaiku.findOneAndUpdate(
    { dayKey, status: 'generating', updatedAt: { $lt: staleBefore } },
    {
      $set: {
        generationOwner: ownerToken,
        generationError: null
      }
    },
    { new: true }
  );

  return Boolean(claimed);
}

async function createGenerationRecord(dayKey, ownerToken) {
  try {
    await DailyHaiku.create({
      dayKey,
      status: 'generating',
      generationOwner: ownerToken
    });
    return true;
  } catch (error) {
    if (error && error.code === 11000) {
      return false;
    }
    throw error;
  }
}

async function getOrCreateDailyHaiku(dayKey = getUtcDayKey()) {
  const cached = await DailyHaiku.findOne({ dayKey, status: 'ready' }).lean();
  if (cached && cached.text) {
    logInfo(`Haiku cache hit for UTC day ${dayKey}`);
    return cached.text;
  }

  const ownerToken = buildOwnerToken();
  let ownsGeneration = false;

  if (await createGenerationRecord(dayKey, ownerToken)) {
    ownsGeneration = true;
    logInfo(`Haiku cache miss for UTC day ${dayKey}. Starting generation.`);
  } else if (await tryClaimFailed(dayKey, ownerToken)) {
    ownsGeneration = true;
    logInfo(`Retrying failed haiku for UTC day ${dayKey}.`);
  } else if (await tryClaimStaleGeneration(dayKey, ownerToken)) {
    ownsGeneration = true;
    logInfo(`Claimed stale haiku generation lock for UTC day ${dayKey}.`);
  }

  if (!ownsGeneration) {
    return waitUntilReady(dayKey);
  }

  try {
    return await runGeneration(dayKey, ownerToken);
  } catch (error) {
    logError(`Daily haiku generation failed for UTC day ${dayKey}:`, error);
    await DailyHaiku.findOneAndUpdate(
      { dayKey, status: 'generating', generationOwner: ownerToken },
      {
        $set: {
          status: 'failed',
          generationError: error && error.message ? error.message : 'Unknown error'
        },
        $unset: { generationOwner: 1 }
      }
    );
    return null;
  }
}

module.exports = {
  getOrCreateDailyHaiku,
  getUtcDayKey
};
