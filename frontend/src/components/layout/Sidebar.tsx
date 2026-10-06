import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed = false,
  onClose,
  onToggleCollapse,
}) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Resumen', icon: 'grid_view' },
    { to: '/pets', label: 'Mis Mascotas', icon: 'pets' },
    { to: '/vincular-qr', label: 'Vincular Placa QR', icon: 'qr_code_scanner' },
    { to: '/cuenta', label: 'Mi Cuenta & Planes', icon: 'manage_accounts' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin/vouchers', label: 'Admin Vouchers', icon: 'confirmation_number' });
  }

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose}></div>}
      <aside
        className={`${styles.sidebar} ${isOpen ? styles.open : ''} ${isCollapsed ? styles.collapsed : ''
          }`}
      >
        <div className={styles.topSection}>
          {/* Logo & Platform Name */}
          <div className={styles.brand}>
            <div className={styles.brandMain}>
              <div className={styles.logoIcon}>
                <img src="/logo-circle.png" alt="MaskayPet Logo" className={styles.logoImg} />
              </div>
              <div className={styles.brandText}>
                <span className={styles.brandName}>MaskayPet</span>
                <span className={styles.brandTagline}>Care & Rescue System</span>
              </div>
            </div>
            <button
              className={styles.closeSidebarBtn}
              onClick={onToggleCollapse || onClose}
              title="Ocultar menú"
            >
              <span className="material-symbols-outlined">menu_open</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className={styles.navSection}>
            <p className={styles.sectionTitle}>Plataforma</p>
            <nav className={styles.nav}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={`material-symbols-outlined ${styles.navIcon}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Legal & Version Footer */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--outline)'
        }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <NavLink to="/terminos" style={{ color: 'var(--outline)', textDecoration: 'none' }} onClick={onClose}>
              Términos
            </NavLink>
            <span>•</span>
            <NavLink to="/privacidad" style={{ color: 'var(--outline)', textDecoration: 'none' }} onClick={onClose}>
              Privacidad
            </NavLink>
          </div>
          <span style={{ textAlign: 'center', fontSize: '10px' }}>MaskayPet © 2026</span>
        </div>
      </aside>
    </>
  );
};
