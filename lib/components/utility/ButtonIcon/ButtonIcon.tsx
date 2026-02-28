import React, { useState } from 'react';
import Tooltip, { type TooltipPlacement } from '../Tooltip';
import Icon, { type IconName } from '../Icon';

export interface ButtonIconProps {
  /** Icon node to display. Optional when `name` is provided. */
  icon?: React.ReactNode;
  /** Icon name from the Icon component. Takes precedence over `icon`. */
  name?: IconName;
  /** Size for the named icon in pixels. Defaults to 16. */
  iconSize?: number;
  label: string;
  onClick: () => void;
  variant?: 'bare' | 'bordered';
  subvariant?: 'danger' | 'warning' | 'info' | 'neutral';
  disabled?: boolean;
  /** Tooltip placement. Defaults to 'bottom'. */
  placement?: TooltipPlacement;
}

export default function ButtonIcon({
  icon,
  name,
  iconSize = 16,
  label,
  onClick,
  variant = 'bare',
  subvariant = 'neutral',
  disabled = false,
  placement = 'bottom',
}: ButtonIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getHoverColor = () => {
    switch (subvariant) {
      case 'danger':  return '#ef4444';
      case 'warning': return '#fbbf24';
      case 'info':    return '#3b82f6';
      default:        return '#94a3b8';
    }
  };

  const getBorderColor = () => {
    switch (subvariant) {
      case 'danger':  return '#ef4444';
      case 'warning': return '#fbbf24';
      case 'info':    return '#3b82f6';
      default:        return '#334155';
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
    fontSize: '16px',
  };

  return (
    <Tooltip text={label} placement={placement}>
      <button
        style={baseStyle}
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        aria-label={label}
      >
        {name ? <Icon name={name} size={iconSize} /> : icon}
      </button>
    </Tooltip>
  );
}
