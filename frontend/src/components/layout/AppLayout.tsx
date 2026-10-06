import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { EmergencyModal } from './EmergencyModal';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`${styles.mainWrapper} ${sidebarCollapsed ? styles.expanded : ''}`}>
        <Header
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenEmergency={() => setEmergencyModalOpen(true)}
        />
        <main className={styles.mainContent}>
          <Outlet context={{ openEmergencyModal: () => setEmergencyModalOpen(true) }} />
        </main>
      </div>

      <BottomNav onOpenEmergency={() => setEmergencyModalOpen(true)} />

      <EmergencyModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        onStatusChanged={() => {
          // Trigger global refresh event if needed
          window.dispatchEvent(new Event('pets-status-updated'));
        }}
      />
    </div>
  );
};
