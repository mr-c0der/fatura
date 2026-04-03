const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

// GET overall stats
router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    let dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = toDate;
      }
    }

    const [invoices, totalProducts] = await Promise.all([
      Invoice.find(dateFilter),
      Product.find()
    ]);

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalInvoices = invoices.length;
    const uniqueCustomers = new Set(invoices.map(inv => inv.customerName.trim().toLowerCase())).size;
    const totalItemsSold = invoices.reduce((sum, inv) => 
      sum + inv.items.reduce((s, item) => s + item.quantity, 0), 0);
    const totalStockValue = totalProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const lowStockProducts = totalProducts.filter(p => p.quantity <= 5).length;

    res.json({
      totalRevenue,
      totalInvoices,
      uniqueCustomers,
      totalItemsSold,
      totalStockValue,
      lowStockProducts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET sales over time (daily for last 30 days)
router.get('/sales-over-time', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let groupFormat, daysBack;
    if (period === 'daily') {
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      daysBack = 30;
    } else {
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      daysBack = 365;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const data = await Invoice.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', revenue: 1, count: 1, _id: 0 } }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET top selling products
router.get('/top-products', async (req, res) => {
  try {
    const { from, to, limit = 8 } = req.query;
    
    let dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = toDate;
      }
    }

    const data = await Invoice.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
      { $project: { name: '$_id', totalQuantity: 1, totalRevenue: 1, _id: 0 } }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET recent invoices
router.get('/recent', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber customerName totalAmount createdAt');
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
