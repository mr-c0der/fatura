import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  MdDashboard, MdInventory2, MdReceipt, MdMenu, MdClose, MdStorefront
} from 'react-icons/md';

const navItems = [
  { to: '/',          icon: <MdDashboard />,  label: 'لوحة التحكم' },
  { to: '/warehouse', icon: <MdInventory2 />, label: 'المستودع'    },
  { to: '/invoice',   icon: <MdReceipt />,    label: 'الفاتورة'    },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const NavContent = () => (
    <>
      {/* Logo */}
      <div style={{
        padding: '28px 24px 24px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40,
            background: 'var(--gradient-primary)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'white'
          }}>
            <MdStorefront />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>فاتورة</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>نظام الفوترة</div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ padding: '8px 12px', flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 12px', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
          القائمة الرئيسية
        </div>
        {navItems.map(item => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                marginBottom: 4,
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--gradient-primary)' : 'transparent',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                fontSize: 15,
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-input)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        نظام الفوترة &copy; {new Date().getFullYear()}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="sidebar" style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border)',
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflowY: 'auto'
      }}>
        <NavContent />
      </div>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 20, right: 20,
          width: 52, height: 52,
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          border: 'none',
          color: 'white',
          fontSize: 22,
          cursor: 'pointer',
          zIndex: 200,
          boxShadow: '0 4px 15px rgba(99,102,241,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="mobile-menu-btn"
      >
        {mobileOpen ? <MdClose /> : <MdMenu />}
      </button>

      {/* Mobile Overlay Sidebar */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 150,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 0, right: 0, bottom: 0,
              width: 'min(280px, 85vw)',
              background: 'var(--bg-sidebar)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.25s ease',
              borderLeft: '1px solid var(--border)',
            }}
          >
            <NavContent />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
