const { logInfo, logError } = require('../utils/logger');
const mongoose = require('mongoose');
const SchemaVersion = require('../models/SchemaVersion');
require('../models/DailyHaiku');

const migrations = [
  // Migration 1: Initial schema with timezone support
  async () => {
    await mongoose.model('User').updateMany(
      {
        $or: [
          { timeZone: { $exists: false } },
          { notificationTime: { $exists: false } },
          { pendingTimezone: { $exists: false } }
        ]
      },
      {
        $set: {
          timeZone: 'Europe/Moscow',
          notificationTime: '09:50',
          pendingTimezone: false
        }
      }
    );
    logInfo('Applied migration 1: Added timezone fields');
  },
  // Migration 2: Add indexes for scheduling and daily haiku caching
  async () => {
    const User = mongoose.model('User');
    const DailyHaiku = mongoose.model('DailyHaiku');

    await User.collection.createIndex(
      { notificationTime: 1, timeZone: 1 },
      { name: 'notificationTime_1_timeZone_1', background: true }
    );

    await DailyHaiku.collection.createIndex(
      { dayKey: 1 },
      { name: 'dayKey_1', unique: true, background: true }
    );

    await DailyHaiku.collection.createIndex(
      { status: 1, updatedAt: 1 },
      { name: 'status_1_updatedAt_1', background: true }
    );

    logInfo('Applied migration 2: Added indexes for users and daily haiku');
  },
  // Migration 3: Cleanup old daily haiku and enforce 5-day retention
  async () => {
    const DailyHaiku = mongoose.model('DailyHaiku');
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const cleanupResult = await DailyHaiku.deleteMany({
      createdAt: { $lt: fiveDaysAgo }
    });

    await DailyHaiku.collection.createIndex(
      { createdAt: 1 },
      { name: 'createdAt_ttl_5d', expireAfterSeconds: 5 * 24 * 60 * 60, background: true }
    );

    logInfo(`Applied migration 3: Removed ${cleanupResult.deletedCount || 0} old daily haiku docs and added TTL index`);
  }
  // Add future migrations here as new array elements
];

module.exports = async () => {
  let versionDoc = await SchemaVersion.findOne();

  if (!versionDoc) {
    versionDoc = await SchemaVersion.create({ version: 0 });
  }

  while (versionDoc.version < migrations.length) {
    const nextVersion = versionDoc.version;
    await migrations[nextVersion]();
    versionDoc = await SchemaVersion.findOneAndUpdate(
      {},
      { $inc: { version: 1 } },
      { new: true }
    );
    logInfo(`Database upgraded to version ${versionDoc.version}`);
  }
};
