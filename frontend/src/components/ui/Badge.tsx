import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'emergency' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  icon?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      {icon && <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
