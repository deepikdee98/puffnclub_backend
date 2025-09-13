const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  identifier: { type: String, required: true }, // email or mobile
  identifierType: { type: String, enum: ['email', 'mobile'], required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
});

module.exports = mongoose.model('Otp', otpSchema);