const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

// GET all invoices (with pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Invoice.countDocuments();
    res.json({ invoices, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create invoice (deducts stock automatically)
router.post('/', async (req, res) => {
  const session = await Invoice.startSession();
  session.startTransaction();
  try {
    const { customerName, items, totalAmount, notes } = req.body;

    // Validate stock for each item
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ message: `المنتج "${item.name}" غير موجود` });
      }
      if (product.quantity < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `الكمية المطلوبة من "${product.name}" (${item.quantity}) تتجاوز المخزون المتاح (${product.quantity})`
        });
      }
    }

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } },
        { session }
      );
    }

    // Create invoice
    const invoice = new Invoice({ customerName, items, totalAmount, notes });
    const savedInvoice = await invoice.save({ session });

    await session.commitTransaction();
    res.status(201).json(savedInvoice);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// DELETE invoice (restore stock)
router.delete('/:id', async (req, res) => {
  const session = await Invoice.startSession();
  session.startTransaction();
  try {
    const invoice = await Invoice.findById(req.params.id).session(session);
    if (!invoice) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    }

    // Restore stock
    for (const item of invoice.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } },
        { session }
      );
    }

    await Invoice.findByIdAndDelete(req.params.id, { session });
    await session.commitTransaction();
    res.json({ message: 'تم حذف الفاتورة وإعادة الكميات إلى المخزون' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
