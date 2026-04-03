import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdAdd, MdDelete, MdPrint, MdDownload, MdSearch, MdReceipt, MdCheck } from 'react-icons/md';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';
import * as XLSX from 'xlsx';

function AutocompleteInput({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (query.trim().length === 0) { setResults([]); setOpen(false); return; }
      try {
        const data = await api.searchProducts(query);
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
    };
    const t = setTimeout(fetchProducts, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (product) => {
    onSelect(product);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="autocomplete-wrapper" ref={ref} style={{ flex: 1 }}>
      <div className="search-wrapper">
        <span className="search-icon"><MdSearch /></span>
        <input
          className="form-control"
          style={{ paddingRight: 40 }}
          placeholder="ابحث عن منتج للإضافة..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && results.length > 0 && setOpen(true)}
        />
      </div>
      {open && (
        <div className="autocomplete-dropdown">
          {results.map(p => (
            <div key={p._id} className="autocomplete-item" onClick={() => handleSelect(p)}>
              <span>{p.name}</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  متوفر: {p.quantity}
                </span>
                <span className="product-price">{p.price} ر.س</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Invoice print CSS
const printStyle = `
  @media print {
    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
    body * { visibility: hidden !important; }
    .invoice-print-area, .invoice-print-area * { visibility: visible !important; }
    .invoice-print-area {
      position: fixed !important; left: 0; top: 0; width: 100vw;
      background: white !important; color: #111 !important;
      padding: 30px !important; z-index: 9999;
      font-family: 'Tajawal', sans-serif !important;
      direction: rtl !important;
    }
  }
`;

export default function Invoice() {
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState([]);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const now = new Date();

  const addItem = useCallback((product) => {
    setItems(prev => {
      const existing = prev.find(it => it.productId === product._id);
      if (existing) {
        return prev.map(it => it.productId === product._id
          ? { ...it, quantity: it.quantity + 1, total: (it.quantity + 1) * it.unitPrice }
          : it
        );
      }
      return [...prev, {
        productId: product._id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price,
        maxQty: product.quantity
      }];
    });
  }, []);

  const updateQty = (productId, qty) => {
    if (qty < 1) return;
    setItems(prev => prev.map(it =>
      it.productId === productId
        ? { ...it, quantity: qty, total: qty * it.unitPrice }
        : it
    ));
  };

  const updatePrice = (productId, price) => {
    setItems(prev => prev.map(it =>
      it.productId === productId
        ? { ...it, unitPrice: price, total: it.quantity * price }
        : it
    ));
  };

  const removeItem = (productId) => {
    setItems(prev => prev.filter(it => it.productId !== productId));
  };

  const totalAmount = items.reduce((s, it) => s + it.total, 0);

  const handleSubmit = async () => {
    if (!customer.trim()) return addToast('يرجى إدخال اسم العميل', 'error');
    if (items.length === 0) return addToast('يرجى إضافة منتج واحد على الأقل', 'error');

    for (const it of items) {
      if (it.quantity > it.maxQty) {
        return addToast(`الكمية المطلوبة من "${it.name}" (${it.quantity}) تتجاوز المخزون (${it.maxQty})`, 'error');
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: customer.trim(),
        items: items.map(it => ({
          product: it.productId,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.total
        })),
        totalAmount
      };
      const invoice = await api.createInvoice(payload);
      setSavedInvoice(invoice);
      addToast('تم حفظ الفاتورة بنجاح', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => window.print();

  const exportToExcel = () => {
    const source = savedInvoice || { customerName: customer, items: items.map(it => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice, totalPrice: it.total })), totalAmount };
    const data = source.items.map((it, i) => ({
      '#': i + 1,
      'المنتج': it.name,
      'الكمية': it.quantity,
      'سعر الوحدة': it.unitPrice,
      'الإجمالي': it.totalPrice
    }));
    data.push({ '#': '', 'المنتج': 'المجموع', 'الكمية': '', 'سعر الوحدة': '', 'الإجمالي': source.totalAmount });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الفاتورة');
    XLSX.writeFile(wb, `فاتورة_${source.customerName || 'عميل'}_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
    addToast('تم تصدير الفاتورة بنجاح', 'success');
  };

  const resetForm = () => {
    setItems([]);
    setCustomer('');
    setSavedInvoice(null);
  };

  const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <style>{printStyle}</style>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">🧾 الفاتورة</h1>
          <p className="text-small text-muted" style={{ margin: '4px 0 0' }}>{dateStr} - {timeStr}</p>
        </div>
        <div className="flex gap-2">
          {(items.length > 0 || savedInvoice) && (
            <>
              <button className="btn btn-secondary" onClick={exportToExcel}><MdDownload /> تصدير Excel</button>
              <button className="btn btn-secondary" onClick={handlePrint}><MdPrint /> طباعة</button>
            </>
          )}
          {savedInvoice && (
            <button className="btn btn-primary" onClick={resetForm}><MdAdd /> فاتورة جديدة</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: savedInvoice ? '1fr' : '1fr 380px', gap: 16 }}>
        {/* Left: Form */}
        {!savedInvoice && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title"><MdReceipt /> بيانات العميل</div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">اسم العميل *</label>
                <input className="form-control" placeholder="أدخل اسم العميل..."
                  value={customer} onChange={e => setCustomer(e.target.value)} />
              </div>
            </div>

            <div className="card">
              <div className="section-title"><MdAdd /> إضافة منتجات</div>
              <AutocompleteInput onSelect={addItem} />

              {items.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 110px 110px 36px',
                    gap: 8, padding: '0 0 8px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--text-muted)', fontWeight: 600
                  }}>
                    <span>المنتج</span>
                    <span>الكمية</span>
                    <span>سعر الوحدة</span>
                    <span>الإجمالي</span>
                    <span></span>
                  </div>

                  {items.map(item => (
                    <div key={item.productId} className="invoice-item-row">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>متوفر: {item.maxQty}</div>
                      </div>
                      <input
                        type="number" min="1" max={item.maxQty}
                        className="form-control" style={{ textAlign: 'center', padding: '6px 8px' }}
                        value={item.quantity}
                        onChange={e => updateQty(item.productId, Number(e.target.value))}
                      />
                      <input
                        type="number" min="0" step="0.01"
                        className="form-control" style={{ padding: '6px 8px' }}
                        value={item.unitPrice}
                        onChange={e => updatePrice(item.productId, Number(e.target.value))}
                      />
                      <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>
                        {item.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </span>
                      <button className="btn-icon danger" onClick={() => removeItem(item.productId)}>
                        <MdDelete />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {items.length === 0 && (
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <div style={{ fontSize: 36 }}>🔍</div>
                  <p className="text-muted text-small">ابدأ بالبحث عن منتج لإضافته للفاتورة</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right: Invoice Preview */}
        <div className={`invoice-print-area ${savedInvoice ? 'card' : 'card'}`}
          style={savedInvoice ? {} : {}}>
          <InvoicePreview
            customer={customer || 'عميل'}
            items={savedInvoice ? savedInvoice.items.map(it => ({
              name: it.name, quantity: it.quantity,
              unitPrice: it.unitPrice, total: it.totalPrice
            })) : items}
            totalAmount={savedInvoice ? savedInvoice.totalAmount : totalAmount}
            invoiceNumber={savedInvoice?.invoiceNumber}
            date={dateStr}
            time={timeStr}
            isSaved={!!savedInvoice}
          />

          {!savedInvoice && items.length > 0 && (
            <button
              className="btn btn-success w-100"
              style={{ marginTop: 16 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'جاري الحفظ...' : <><MdCheck /> حفظ الفاتورة</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ customer, items, totalAmount, invoiceNumber, date, time, isSaved }) {
  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid var(--border)' }}>
        <div style={{
          width: 56, height: 56,
          background: 'var(--gradient-primary)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 10px'
        }}>🏪</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>نظام الفوترة</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>فاتورة مبيعات</p>
      </div>

      {/* Invoice Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>العميل: </span>
          <strong>{customer}</strong>
        </div>
        {invoiceNumber && (
          <div style={{ textAlign: 'left' }}>
            <span style={{ color: 'var(--text-muted)' }}>رقم الفاتورة: </span>
            <strong style={{ color: 'var(--primary-light)' }}>{invoiceNumber}</strong>
          </div>
        )}
        <div>
          <span style={{ color: 'var(--text-muted)' }}>التاريخ: </span>
          <span>{date}</span>
        </div>
        <div style={{ textAlign: 'left' }}>
          <span style={{ color: 'var(--text-muted)' }}>الوقت: </span>
          <span>{time}</span>
        </div>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <>
          <table style={{ width: '100%', fontSize: 13, marginBottom: 12 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-input)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11 }}>المنتج</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11 }}>الكمية</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11 }}>السعر</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11 }}>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px' }}>{it.name}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.quantity}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    {Number(it.unitPrice).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>
                    {Number(it.total || it.totalPrice).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-summary">
            <div className="invoice-summary-row total">
              <span>المجموع الكلي</span>
              <span>{totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س</span>
            </div>
          </div>

          {isSaved && (
            <div style={{ textAlign: 'center', marginTop: 20, padding: 12, borderTop: '1px dashed var(--border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>شكراً لتعاملكم معنا 🙏</p>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state" style={{ padding: '20px' }}>
          <p className="text-muted text-small">لم يتم إضافة أي منتجات بعد</p>
        </div>
      )}
    </div>
  );
}
