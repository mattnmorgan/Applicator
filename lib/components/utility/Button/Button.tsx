'use client';

import React, { useState } from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  fullWidth?: boolean;
  title?: string;
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
  style,
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = COLORS[variant];

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
      type={type}
      style={computedStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
