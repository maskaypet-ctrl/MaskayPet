import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label }) => {
  return (
    <div className={styles.spinnerWrap}>
      <div className={`${styles.spinner} ${styles[size]}`}></div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
};
