const mongoose = require('mongoose');

const schemaVersionSchema = new mongoose.Schema({
  version: {
    type: Number,
    default: 0,
    required: true
  }
});

module.exports = mongoose.model('SchemaVersion', schemaVersionSchema);