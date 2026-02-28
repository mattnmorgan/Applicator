'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  fullWidth?: boolean;
  title?: string;
  /** Show a centered tooltip popover on hover */
  popover?: string;
  style?: React.CSSProperties;
}

const COLORS: Record<NonNullable<ButtonProps['variant']>, { base: string; hover: string; text: string; border: string }> = {
  primary: { base: '#3b82f6', hover: '#2563eb', text: '#ffffff', border: 'none' },
  secondary: { base: '#334155', hover: '#475569', text: '#f1f5f9', border: 'none' },
  ghost: { base: '#1e293b', hover: '#334155', text: '#e2e8f0', border: '1px solid #334155' },
  danger: { base: '#ef4444', hover: '#dc2626', text: '#ffffff', border: 'none' },
  success: { base: '#10b981', hover: '#059669', text: '#ffffff', border: 'none' },
  warning: { base: '#fbbf24', hover: '#f59e0b', text: '#0f172a', border: 'none' },
};

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  title,
  popover,
  style,
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; position: 'above' | 'below' } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const colors = COLORS[variant];

  useEffect(() => {
    if (showPopover && popover && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const centerX = rect.left + rect.width / 2;
      if (spaceBelow < 42) {
        setPopoverCoords({ top: rect.top - 8, left: centerX, position: 'above' });
      } else {
        setPopoverCoords({ top: rect.bottom + 8, left: centerX, position: 'below' });
      }
    } else {
      setPopoverCoords(null);
    }
  }, [showPopover, popover]);

  const computedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '36px',
    padding: '0 14px',
    background: disabled ? '#475569' : isHovered ? colors.hover : colors.base,
    color: disabled ? '#94a3b8' : colors.text,
    border: colors.border,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s',
    width: fullWidth ? '100%' : undefined,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    ...style,
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      style={computedStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => {
        if (!disabled) setIsHovered(true);
        if (popover) setShowPopover(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPopover(false);
      }}
      disabled={disabled}
      title={popover ? undefined : title}
      aria-label={popover || title}
    >
      {children}
      {showPopover && !disabled && popoverCoords && popover && typeof document !== 'undefined' &&
        createPortal(
          <div style={{
            position: 'fixed',
            top: popoverCoords.position === 'above' ? 'auto' : popoverCoords.top,
            bottom: popoverCoords.position === 'above' ? window.innerHeight - popoverCoords.top : 'auto',
            left: popoverCoords.left,
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#f1f5f9',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 99999,
            border: '1px solid #334155',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}>
            {popover}
          </div>,
          document.body
        )
      }
    </button>
  );
}
