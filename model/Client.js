const mongoose = require('mongoose'); 
const ClientSchema = new mongoose.Schema({
  uid:{
    type: String,
    default: Math.floor(new Date().getTime()/1000).toString()
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'user'
  },
 

});

const Client = mongoose.model('Client', ClientSchema);

module.exports = Client;
