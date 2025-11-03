const mongoose = require('mongoose');

const pacienteSchema = new mongoose.Schema({
  // Datos Estaticos
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
      type: String,
      required: true
    },
    dni: {
        type: String,
        required: true,
        unique: true
    },
    telefono: {
        type: String,
        required: true
    },
    sexo: {
      type: String,
      required: false
    },
    direccion: {
      type: String,
      required: false
    },
    fechaNacimiento: {
      type: String,
      required: false
    },
    edad: {
      type: String,
      required: false
    },
    obraSocial: {
      type: String,
      required: false
    },
    fechaApertura: {
      type: String,
      required: false
    },

    // Datos Dinamicos

    historial: [{
      fecha: { type: String, required: false },
      area: { type: String, required: true },
      profesional: { type: String, required: true },
      sintomas: { type: String, required: true} ,
      diagnostico: { type: String, required: true },
      tratamiento: { type: String, required: true },
      dientes: [{
        numero: { type: String, required: false },
        notas: { type: String, required: false },
        estado: { type: String, required: false }
      }]
    }]
});

const Paciente = mongoose.model('Paciente', pacienteSchema);
module.exports = Paciente;
