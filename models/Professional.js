// models/Professional.js
const mongoose = require('mongoose');

// Definir el esquema
const professionalSchema = new mongoose.Schema({
    area: {
        type: String,
        required: true,
        unique: true
    },
    professionals: {
        type: [String],
        default: []
    }
});

// Crear el modelo basado en el esquema
const Professional = mongoose.model('Professional', professionalSchema);

module.exports = Professional;
