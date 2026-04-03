import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Warehouse from './pages/Warehouse';
import Invoice from './pages/Invoice';
import { ToastProvider } from './context/ToastContext';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/invoice"   element={<Invoice />}   />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
