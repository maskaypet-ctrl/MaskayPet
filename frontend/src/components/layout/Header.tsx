import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsService } from '../../services/notifications.service';
import { NotificationItem } from '../../types';
import styles from './Header.module.css';

interface HeaderProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar: () => void;
  onOpenEmergency: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenEmergency,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const notifs = await notificationsService.getMyNotifications();
        if (Array.isArray(notifs)) {
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n) => n.status !== 'read').length);
        }
      } catch {
        // Silent fail
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s poll
    window.addEventListener('notifications-refresh', fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-refresh', fetchNotifications);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Mi Cuenta';

  return (
    <header className={`${styles.header} ${isSidebarCollapsed ? styles.fullWidth : ''}`}>
      {/* Left: Mobile/Desktop Toggle & Network Status */}
      <div className={styles.headerLeft}>
        <button
          className={styles.menuBtn}
          onClick={onToggleSidebar}
          aria-label="Alternar menú de navegación"
          title={isSidebarCollapsed ? 'Mostrar menú de navegación' : 'Ocultar menú de navegación'}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className={styles.networkBadge}>
          <span className={styles.liveDot}></span>
          <span className={styles.networkText}>Red de Rescate Nacional Operativa</span>
        </div>

        {/* Mobile Brand (Shown only on mobile <= 768px) */}
        <div className={styles.mobileBrand}>
          <div className={styles.mobileBrandLogo}>
            <span className="material-symbols-outlined">pets</span>
          </div>
          <span className={styles.mobileBrandTitle}>MaskayPet</span>
        </div>
      </div>

      {/* Right: Emergency Button, Notifications, Profile */}
      <div className={styles.headerRight}>
        {/* Emergency Mode Button */}
        <button
          className={styles.emergencyBtn}
          onClick={onOpenEmergency}
          type="button"
          title="Activar protocolo de búsqueda de emergencia para una mascota"
        >
          <span className="material-symbols-outlined animate-pulse-fast">e911_emergency</span>
          <span className={styles.emergencyBtnText}>Modo Rescate</span>
        </button>

        {/* Notifications Dropdown */}
        <div className={styles.dropdownWrap} ref={notifRef}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Ver notificaciones"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && <span className={styles.badgeDot}>{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className={styles.notifDropdown}>
              <div className={styles.dropdownHeader}>
                <h4 className={styles.dropdownTitle}>Notificaciones</h4>
                {unreadCount > 0 && (
                  <button className={styles.actionBtn} onClick={handleMarkAllRead}>
                    Marcar leídas
                  </button>
                )}
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyNotifs}>
                    <span className="material-symbols-outlined">notifications_paused</span>
                    <p>No tienes notificaciones pendientes</p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map((notif) => (
                    <div
                      key={notif.id}
                      className={`${styles.notifItem} ${notif.status !== 'read' ? styles.unread : ''}`}
                      onClick={async () => {
                        try {
                          await notificationsService.markAsRead(notif.id);
                          setNotifications((prev) =>
                            prev.map((n) => (n.id === notif.id ? { ...n, status: 'read' } : n)),
                          );
                          setUnreadCount((c) => Math.max(0, c - 1));
                        } catch {}
                        setShowNotifications(false);
                        if (notif.pet_id) {
                          navigate(`/pets/${notif.pet_id}?tab=radar`);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      title={notif.pet_id ? 'Ver ficha de la mascota' : undefined}
                    >
                      <div className={styles.notifIconWrap}>
                        <span className="material-symbols-outlined">
                          {notif.type.includes('lost') || notif.type.includes('location') ? 'warning' : 'info'}
                        </span>
                      </div>
                      <div className={styles.notifContent}>
                        <h5 className={styles.notifItemTitle}>{notif.title}</h5>
                        <p className={styles.notifItemMessage}>{notif.message}</p>
                        <span className={styles.notifTime}>
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className={styles.dropdownWrap} ref={profileRef}>
          <button
            className={styles.profileBtn}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className={styles.avatar}>
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className={styles.profileText}>
              <span className={styles.profileName}>{displayName}</span>
              <span className={styles.profileRole}>Tutor Responsable</span>
            </div>
            <span className="material-symbols-outlined">expand_more</span>
          </button>

          {showProfileMenu && (
            <div className={styles.profileDropdown}>
              <div className={styles.profileDropdownHeader}>
                <p className={styles.dropdownUserEmail}>{user?.email}</p>
                <span className={styles.dropdownUserPlan}>
                  {user?.roles?.includes('admin') ? 'Administrador' : 'Plan Activo'}
                </span>
              </div>
              <div className={styles.profileDropdownBody}>
                <a href="/cuenta" className={styles.menuItem}>
                  <span className="material-symbols-outlined">account_circle</span>
                  <span>Mi Perfil & Planes</span>
                </a>
                <a href="/vincular-qr" className={styles.menuItem}>
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                  <span>Vincular Placa QR</span>
                </a>
                <button
                  className={`${styles.menuItem} ${styles.logoutItem}`}
                  onClick={logout}
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
