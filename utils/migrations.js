const { logInfo, logError } = require('../utils/logger');
const mongoose = require('mongoose');
const SchemaVersion = require('../models/SchemaVersion');

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