const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI

mongoose.connect(uri)
  .then(() => {
    console.log('Conectado a MongoDB');
  })
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
  });

module.exports = mongoose;
