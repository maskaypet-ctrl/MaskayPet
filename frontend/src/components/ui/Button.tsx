import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'emergency' | 'outline' | 'ghost' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`
        ${styles.btn}
        ${styles[variant]}
        ${styles[size]}
        ${fullWidth ? styles.fullWidth : ''}
        ${isLoading ? styles.loading : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className={styles.spinner}></span>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>
          )}
          <span className={styles.text}>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>
          )}
        </>
      )}
    </button>
  );
};
