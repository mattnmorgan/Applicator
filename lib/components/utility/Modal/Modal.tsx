'use client';

import { type ReactNode, useEffect } from 'react';
import styles from './Modal.module.css';

export interface ModalProps {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeable?: boolean;
  onClose?: () => void;
  maxWidth?: number;
  maxWidthUnit?: string;
}

export default function Modal({
  header,
  children,
  footer,
  closeable = false,
  onClose,
  maxWidth = 600,
  maxWidthUnit = 'px',
}: ModalProps) {
  useEffect(() => {
    if (!closeable || !onClose) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeable, onClose]);

  const handleOverlayClick = () => {
    if (closeable && onClose) onClose();
  };

  const maxWidthValue = `${maxWidth}${maxWidthUnit}`;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        className={styles.modal}
        style={{ maxWidth: maxWidthValue }}
        onClick={(e) => e.stopPropagation()}
      >
        {header !== undefined && (
          <div className={styles.header}>
            <div className={styles.headerContent}>{header}</div>
            {closeable && onClose && (
              <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {footer !== undefined && (
          <div className={styles.footer}>{footer}</div>
        )}
      </div>
    </div>
  );
}
