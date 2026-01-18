import React, { useState } from 'react';

export interface ButtonIconProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'bare' | 'bordered';
  subvariant?: 'danger' | 'warning' | 'info' | 'neutral';
  disabled?: boolean;
}

export default function ButtonIcon({
  icon,
  label,
  onClick,
  variant = 'bare',
  subvariant = 'neutral',
  disabled = false,
}: ButtonIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const getHoverColor = () => {
    switch (subvariant) {
      case 'danger':
        return '#ef4444'; // red-500
      case 'warning':
        return '#fbbf24'; // amber-400
      case 'info':
        return '#3b82f6'; // blue-500
      case 'neutral':
      default:
        return '#94a3b8'; // slate-400
    }
  };

  const getBorderColor = () => {
    switch (subvariant) {
      case 'danger':
        return '#ef4444'; // red-500
      case 'warning':
        return '#fbbf24'; // amber-400
      case 'info':
        return '#3b82f6'; // blue-500
      case 'neutral':
      default:
        return '#334155'; // slate-700
    }
  };

  const baseStyle: React.CSSProperties = {
    background: 'none',
    border: variant === 'bordered' ? `1px solid ${getBorderColor()}` : 'none',
    padding: variant === 'bordered' ? '6px' : '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: isHovered && !disabled ? getHoverColor() : '#e2e8f0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'color 0.2s ease, border-color 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    position: 'relative',
    fontSize: '16px',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '-32px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1e293b',
    color: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 1000,
    border: '1px solid #334155',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  };

  return (
    <button
      style={baseStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowTooltip(false);
      }}
      disabled={disabled}
      aria-label={label}
    >
      {icon}
      {showTooltip && !disabled && (
        <div style={tooltipStyle}>
          {label}
        </div>
      )}
    </button>
  );
}
