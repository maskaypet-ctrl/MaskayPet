import React from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
}) => {
  return (
    <div className={`${styles.tabs} ${styles[variant]}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            {tab.icon && (
              <span className={`material-symbols-outlined ${styles.tabIcon}`}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={styles.tabBadge}>{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
