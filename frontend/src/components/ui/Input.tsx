import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  rightIcon,
  onRightIconClick,
  rightElement,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.hasError : ''}`}>
        {icon && <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>}
        <input id={inputId} className={styles.input} {...props} />
        {rightIcon && (
          <button
            type="button"
            className={styles.rightIconBtn}
            onClick={onRightIconClick}
            tabIndex={-1}
            aria-label="Toggle input view"
          >
            <span className="material-symbols-outlined">{rightIcon}</span>
          </button>
        )}
        {rightElement}
      </div>
      {error && <span className={styles.error}>{error}</span>}
      {!error && helperText && <span className={styles.helper}>{helperText}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.hasError : ''}`}>
        <select id={selectId} className={styles.select} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={`material-symbols-outlined ${styles.selectArrow}`}>expand_more</span>
      </div>
      {error && <span className={styles.error}>{error}</span>}
      {!error && helperText && <span className={styles.helper}>{helperText}</span>}
    </div>
  );
};
