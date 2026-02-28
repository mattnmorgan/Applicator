'use client';

import React, { useState } from 'react';
import Tooltip, { type TooltipPlacement } from '../Tooltip';

export interface ButtonColors {
  base?: string;
  hover?: string;
  active?: string;
  text?: string;
  border?: string;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  fullWidth?: boolean;
  title?: string;
  /** Show a tooltip on hover */
  popover?: string;
  /** Placement of the popover tooltip */
  popoverPlacement?: TooltipPlacement;
  /** Override individual color states */
  colors?: ButtonColors;
  style?: React.CSSProperties;
}

const VARIANTS: Record<
  NonNullable<ButtonProps['variant']>,
  { base: string; hover: string; active: string; text: string; border: string }
> = {
  primary:   { base: '#3b82f6', hover: '#2563eb', active: '#1d4ed8', text: '#ffffff', border: 'none' },
  secondary: { base: '#334155', hover: '#475569', active: '#1e293b', text: '#f1f5f9', border: 'none' },
  ghost:     { base: '#1e293b', hover: '#334155', active: '#0f172a', text: '#e2e8f0', border: '1px solid #334155' },
  danger:    { base: '#ef4444', hover: '#dc2626', active: '#b91c1c', text: '#ffffff', border: 'none' },
  success:   { base: '#10b981', hover: '#059669', active: '#047857', text: '#ffffff', border: 'none' },
  warning:   { base: '#fbbf24', hover: '#f59e0b', active: '#d97706', text: '#0f172a', border: 'none' },
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
  popoverPlacement,
  colors,
  style,
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const v = VARIANTS[variant];

  const base   = colors?.base   ?? v.base;
  const hover  = colors?.hover  ?? v.hover;
  const active = colors?.active ?? colors?.hover ?? v.active;
  const text   = colors?.text   ?? v.text;
  const border = colors?.border ?? v.border;

  const bg = disabled ? '#475569' : isActive ? active : isHovered ? hover : base;

  const computedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '36px',
    padding: '0 14px',
    background: bg,
    color: disabled ? '#94a3b8' : text,
    border,
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

  const btn = (
    <button
      type={type}
      style={computedStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (!disabled) setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => { if (!disabled) setIsActive(true); }}
      onMouseUp={() => setIsActive(false)}
      disabled={disabled}
      title={popover ? undefined : title}
      aria-label={popover || title}
    >
      {children}
    </button>
  );

  if (popover) {
    return (
      <Tooltip text={popover} placement={popoverPlacement ?? 'bottom'}>
        {btn}
      </Tooltip>
    );
  }

  return btn;
}
