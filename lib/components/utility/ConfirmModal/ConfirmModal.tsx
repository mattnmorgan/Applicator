'use client';

import { useEffect } from 'react';
import styles from './ConfirmModal.module.css';
import Button from '../Button';
import Spinner from '../Spinner';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: ConfirmModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel, loading]);

  return (
    <div className={styles.overlay} onClick={loading ? undefined : onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeButton} onClick={loading ? undefined : onCancel} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelText}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={loading ? undefined : onConfirm} disabled={loading}>
            {loading ? <Spinner size={16} color="#ffffff" /> : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
