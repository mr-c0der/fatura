const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET search products (for autocomplete)
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const products = await Product.find({
      name: { $regex: query, $options: 'i' }
    }).limit(10).select('name price quantity unit');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  const product = new Product({
    name: req.body.name,
    quantity: req.body.quantity,
    price: req.body.price,
    unit: req.body.unit || 'قطعة'
  });
  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'اسم المنتج موجود مسبقاً' });
    }
    res.status(400).json({ message: err.message });
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { 
        name: req.body.name,
        quantity: req.body.quantity,
        price: req.body.price,
        unit: req.body.unit
      },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'اسم المنتج موجود مسبقاً' });
    }
    res.status(400).json({ message: err.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
