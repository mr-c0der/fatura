const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    default: 'قطعة'
  }
}, { timestamps: true });

// Text index for Arabic search
productSchema.index({ name: 'text' });

module.exports = mongoose.model('Product', productSchema);
