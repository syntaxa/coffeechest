const mongoose = require('mongoose');

const dailyHaikuSchema = new mongoose.Schema({
  dayKey: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['generating', 'ready', 'failed'],
    default: 'generating'
  },
  generationOwner: {
    type: String,
    default: null
  },
  generationError: {
    type: String,
    default: null
  },
  generatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

dailyHaikuSchema.index({ dayKey: 1 }, { unique: true });
dailyHaikuSchema.index({ status: 1, updatedAt: 1 });
dailyHaikuSchema.index(
  { createdAt: 1 },
  { name: 'createdAt_ttl_5d', expireAfterSeconds: 5 * 24 * 60 * 60 }
);

module.exports = mongoose.model('DailyHaiku', dailyHaikuSchema);
