// models/ActivationCode.js
const mongoose = require('mongoose');

const activationCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    used: { type: Boolean, default: false }
});

module.exports = mongoose.model('ActivationCode', activationCodeSchema);
