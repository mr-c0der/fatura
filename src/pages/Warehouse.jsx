import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdDownload, MdClose, MdInventory2, MdWarning } from 'react-icons/md';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';
import * as XLSX from 'xlsx';

const UNITS = ['قطعة', 'كيلوغرام', 'غرام', 'لتر', 'علبة', 'كرتون', 'حبة', 'متر', 'دستة'];

function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', quantity: '', price: '', unit: 'قطعة' });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (product) setForm({ name: product.name, quantity: product.quantity, price: product.price, unit: product.unit || 'قطعة' });
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return addToast('يرجى إدخال اسم المنتج', 'error');
    if (form.price === '' || Number(form.price) < 0) return addToast('يرجى إدخال سعر صحيح', 'error');
    if (form.quantity === '' || Number(form.quantity) < 0) return addToast('يرجى إدخال كمية صحيحة', 'error');
    
    setLoading(true);
    try {
      const data = { name: form.name.trim(), quantity: Number(form.quantity), price: Number(form.price), unit: form.unit };
      if (product) await api.updateProduct(product._id, data);
      else await api.createProduct(data);
      addToast(product ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 'success');
      onSave();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{product ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
          <button className="btn-icon" onClick={onClose}><MdClose /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">اسم المنتج *</label>
            <input className="form-control" placeholder="مثال: أرز بسمتي" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">الكمية *</label>
              <input type="number" className="form-control" placeholder="0" min="0" value={form.quantity}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">السعر *</label>
              <input type="number" className="form-control" placeholder="0.00" min="0" step="0.01" value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">الوحدة</label>
            <select className="form-control" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ...' : (product ? 'حفظ التغييرات' : 'إضافة المنتج')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: 48, color: 'var(--danger)', marginBottom: 12 }}><MdWarning /></div>
          <p style={{ margin: 0, fontSize: 15 }}>{message}</p>
          <div className="modal-footer" style={{ justifyContent: 'center', marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button className="btn btn-danger" onClick={onConfirm}>نعم، احذف</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Warehouse() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { addToast } = useToast();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleDelete = async (id) => {
    try {
      await api.deleteProduct(id);
      addToast('تم حذف المنتج بنجاح', 'success');
      setConfirmDelete(null);
      loadProducts();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const exportToExcel = () => {
    const data = filtered.map(p => ({
      'اسم المنتج': p.name,
      'الكمية': p.quantity,
      'الوحدة': p.unit || 'قطعة',
      'السعر': p.price,
      'القيمة الإجمالية': p.price * p.quantity,
      'الحالة': p.quantity === 0 ? 'نفد' : p.quantity <= 5 ? 'منخفض' : 'متوفر'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المستودع');
    XLSX.writeFile(wb, `مستودع_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
    addToast('تم تصدير الملف بنجاح', 'success');
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filtered.reduce((s, p) => s + p.price * p.quantity, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏭 إدارة المستودع</h1>
          <p className="text-small text-muted" style={{ margin: '4px 0 0' }}>
            {products.length} منتج · قيمة المخزون: {totalValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <MdDownload /> تصدير Excel
          </button>
          <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
            <MdAdd /> إضافة منتج
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="search-wrapper flex-1" style={{ maxWidth: 340 }}>
          <span className="search-icon"><MdSearch /></span>
          <input
            className="form-control"
            style={{ paddingRight: 40 }}
            placeholder="بحث عن منتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <h3>{search ? 'لا توجد نتائج' : 'المستودع فارغ'}</h3>
            <p className="text-muted text-small">
              {search ? 'جرّب بحثاً مختلفاً' : 'ابدأ بإضافة منتجاتك'}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم المنتج</th>
                  <th>الكمية</th>
                  <th>الوحدة</th>
                  <th>السعر</th>
                  <th>القيمة الإجمالية</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.quantity.toLocaleString('ar-EG')}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.unit || 'قطعة'}</td>
                    <td style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
                      {p.price.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {(p.price * p.quantity).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {p.quantity === 0
                        ? <span className="badge badge-danger">نفد</span>
                        : p.quantity <= 5
                          ? <span className="badge badge-warning">منخفض</span>
                          : <span className="badge badge-success">متوفر</span>
                      }
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon" title="تعديل"
                          onClick={() => { setEditProduct(p); setShowModal(true); }}>
                          <MdEdit />
                        </button>
                        <button className="btn-icon danger" title="حذف"
                          onClick={() => setConfirmDelete(p)}>
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editProduct}
          onSave={() => { setShowModal(false); loadProducts(); }}
          onClose={() => setShowModal(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`هل أنت متأكد من حذف "${confirmDelete.name}"؟`}
          onConfirm={() => handleDelete(confirmDelete._id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
