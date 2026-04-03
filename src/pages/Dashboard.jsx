import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { MdAttachMoney, MdReceipt, MdPeople, MdInventory2, MdWarning, MdShoppingCart } from 'react-icons/md';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const PeriodBtn = ({ label, active, onClick }) => (
  <button onClick={onClick} className="btn" style={{
    padding: '6px 14px', fontSize: 13,
    background: active ? 'var(--gradient-primary)' : 'var(--bg-input)',
    color: active ? 'white' : 'var(--text-secondary)',
    border: '1px solid ' + (active ? 'transparent' : 'var(--border)')
  }}>{label}</button>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-light)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13
    }}>
      <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', fontSize: 12 }}>{label}</p>
      {payload.map((item, i) => (
        <p key={i} style={{ margin: 0, color: item.color, fontWeight: 600 }}>
          {item.name}: {Number(item.value).toLocaleString('ar-EG')}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sales, top, recent] = await Promise.all([
        api.getDashboardStats(),
        api.getSalesOverTime(period),
        api.getTopProducts(),
        api.getRecentInvoices()
      ]);
      setStats(s);
      setSalesData(sales.map(d => ({
        date: d.date,
        'المبيعات': d.revenue,
        'الفواتير': d.count
      })));
      setTopProducts(top);
      setRecentInvoices(recent);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [period, addToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="spinner" />;

  const statCards = [
    {
      label: 'إجمالي المبيعات',
      value: stats ? `${stats.totalRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س` : '---',
      icon: <MdAttachMoney />, color: '#6366f1', bg: 'rgba(99,102,241,0.15)'
    },
    {
      label: 'عدد الفواتير',
      value: stats?.totalInvoices?.toLocaleString('ar-EG') || '0',
      icon: <MdReceipt />, color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)'
    },
    {
      label: 'العملاء الفريدون',
      value: stats?.uniqueCustomers?.toLocaleString('ar-EG') || '0',
      icon: <MdPeople />, color: '#10b981', bg: 'rgba(16,185,129,0.15)'
    },
    {
      label: 'قيمة المخزون',
      value: stats ? `${stats.totalStockValue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س` : '---',
      icon: <MdInventory2 />, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'
    },
    {
      label: 'إجمالي المباع',
      value: stats?.totalItemsSold?.toLocaleString('ar-EG') || '0',
      icon: <MdShoppingCart />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)'
    },
    {
      label: 'منتجات منخفضة المخزون',
      value: stats?.lowStockProducts?.toLocaleString('ar-EG') || '0',
      icon: <MdWarning />, color: stats?.lowStockProducts > 0 ? '#ef4444' : '#10b981',
      bg: stats?.lowStockProducts > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 لوحة التحكم</h1>
          <p className="text-small text-muted" style={{ margin: '4px 0 0' }}>
            نظرة عامة على أداء المتجر
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {statCards.map((card, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ fontSize: 18 }}>{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <PeriodBtn label="يومي (30 يوم)" active={period === 'daily'}   onClick={() => setPeriod('daily')} />
        <PeriodBtn label="شهري (السنة)"  active={period === 'monthly'} onClick={() => setPeriod('monthly')} />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Bar Chart */}
        <div className="card" style={{ padding: 20 }}>
          <div className="section-title">📈 المبيعات عبر الزمن</div>
          {salesData.length === 0 ? (
            <div className="empty-state"><p>لا توجد بيانات مبيعات حتى الآن</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="المبيعات" fill="url(#barGrad)" radius={[4,4,0,0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card" style={{ padding: 20 }}>
          <div className="section-title">🥧 أكثر المنتجات مبيعاً</div>
          {topProducts.length === 0 ? (
            <div className="empty-state"><p>لا توجد بيانات بعد</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={topProducts} cx="50%" cy="50%" outerRadius={90}
                  dataKey="totalQuantity" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} وحدة`, 'الكمية']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card" style={{ padding: 0 }}>
        <div className="section-title" style={{ padding: '16px 20px 12px', margin: 0 }}>
          🧾 آخر الفواتير
        </div>
        {recentInvoices.length === 0 ? (
          <div className="empty-state"><p>لا توجد فواتير بعد</p></div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map(inv => (
                  <tr key={inv._id}>
                    <td><span className="badge badge-primary">{inv.invoiceNumber}</span></td>
                    <td><strong>{inv.customerName}</strong></td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {inv.totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(inv.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
