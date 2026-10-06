import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

interface BottomNavProps {
  onOpenEmergency: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenEmergency }) => {
  return (
    <nav className={styles.bottomNav}>
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <span className="material-symbols-outlined">grid_view</span>
        <span>Resumen</span>
      </NavLink>

      <NavLink
        to="/pets"
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <span className="material-symbols-outlined">pets</span>
        <span>Mascotas</span>
      </NavLink>

      <button
        type="button"
        className={styles.emergencyFab}
        onClick={onOpenEmergency}
        title="Modo Rescate Satelital"
      >
        <span className="material-symbols-outlined animate-pulse-fast">e911_emergency</span>
        <span className={styles.fabText}>SOS</span>
      </button>

      <NavLink
        to="/vincular-qr"
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <span className="material-symbols-outlined">qr_code_scanner</span>
        <span>Placa QR</span>
      </NavLink>

      <NavLink
        to="/cuenta"
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <span className="material-symbols-outlined">manage_accounts</span>
        <span>Cuenta</span>
      </NavLink>
    </nav>
  );
};
