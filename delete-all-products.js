const mongoose = require('mongoose');
const Product = require('./Models/productdetails');
require('dotenv').config();

mongoose.connect(process.env.CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const result = await Product.deleteMany({});
    console.log('All products deleted:', result.deletedCount);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    mongoose.disconnect();
  });
