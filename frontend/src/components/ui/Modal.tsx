import React, { useEffect } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: string;
  iconVariant?: 'primary' | 'emergency' | 'secondary';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  icon,
  iconVariant = 'primary',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.dialog} ${styles[maxWidth]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.mobileHandle} />
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {icon && (
              <div className={`${styles.iconWrap} ${styles[iconVariant]}`}>
                <span className="material-symbols-outlined">{icon}</span>
              </div>
            )}
            <div>
              <h3 className={styles.title}>{title}</h3>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};
