import React from 'react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'emergency';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  sublabel,
  icon,
  variant = 'primary',
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <div className={styles.valueRow}>
          <span className={styles.value}>{value}</span>
          {sublabel && <span className={`${styles.sublabel} ${styles[`text-${variant}`]}`}>{sublabel}</span>}
        </div>
      </div>
      <div className={`${styles.iconWrap} ${styles[variant]}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>
  );
};
