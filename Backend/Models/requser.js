const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  ward: { type: String, required: true },
  verified: { type: Boolean, default: false },
});

module.exports = mongoose.model('Resident', residentSchema);
