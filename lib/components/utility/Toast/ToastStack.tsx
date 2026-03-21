'use client';

import { createPortal } from 'react-dom';
import Toast from './Toast';
import styles from './Toast.module.css';

export interface ToastItem {
  message: string;
  title?: string;
  type: 'success' | 'error';
  duration?: number;
}

interface ToastStackProps {
  toasts: ToastItem[];
  onClose: (index: number) => void;
}

export default function ToastStack({ toasts, onClose }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <>
      {createPortal(
        <div className={styles.toastStack}>
          {toasts.map((toast, index) => (
            <Toast
              key={index}
              message={toast.message}
              title={toast.title}
              type={toast.type}
              duration={toast.type === "error" ? (toast.duration ?? 0) : toast.duration}
              onClose={() => onClose(index)}
            />
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
