const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api'
  : 'http://localhost:5000/api';

const request = async (method, url, data = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);
  
  const res = await fetch(`${API_BASE}${url}`, options);
  const json = await res.json();
  
  if (!res.ok) throw new Error(json.message || 'حدث خطأ غير متوقع');
  return json;
};

// Products
export const getProducts = () => request('GET', '/products');
export const searchProducts = (q) => request('GET', `/products/search?q=${encodeURIComponent(q)}`);
export const createProduct = (data) => request('POST', '/products', data);
export const updateProduct = (id, data) => request('PUT', `/products/${id}`, data);
export const deleteProduct = (id) => request('DELETE', `/products/${id}`);

// Invoices
export const getInvoices = (page = 1) => request('GET', `/invoices?page=${page}`);
export const createInvoice = (data) => request('POST', '/invoices', data);
export const deleteInvoice = (id) => request('DELETE', `/invoices/${id}`);

// Dashboard
export const getDashboardStats = (from, to) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return request('GET', `/dashboard/stats?${params}`);
};
export const getSalesOverTime = (period = 'monthly') => 
  request('GET', `/dashboard/sales-over-time?period=${period}`);
export const getTopProducts = (from, to) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return request('GET', `/dashboard/top-products?${params}`);
};
export const getRecentInvoices = () => request('GET', '/dashboard/recent');
