const mongoose = require('mongoose');
const { type } = require('os');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: false,
    },
    email: {
    type: String,
    required: false,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo válido'],
  },

    dni: {
        type: Number,
        required: true,
        unique: true,
    },
    telefono: {
        type: Number,
        required: false,
    },
    password: {
        type: String,
        required: true,
    },
    activationCode: {
        type: String,
        required: true,
    },
    startHour: {
        type: String,
        required: false
    },
    endHour: {
        type: String,
        required: false
    },
    area:{
        type: String,
        require: false
    },
    descripcion:{
        type: String,
        require: false
    },
    precio:{
        type: String,
        require: false
    },
    direccion:{
        type: String,
        require: false
    },
    calendarid:{
        type: String,
        require: false
    },
    image: {
    type: String,
    required: false,
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
