'use client';

import React from 'react';
import ButtonMenu from '../ButtonMenu';

export interface BreadcrumbItem {
  label: string;
  /** If provided, the item is clickable */
  onClick?: () => void;
  /** Mark as the current/active location — renders bold + blue */
  active?: boolean;
  /** Prevent clicking even if onClick is provided — renders as inaccessible */
  disabled?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Separator between items. Defaults to ">" */
  separator?: React.ReactNode;
  style?: React.CSSProperties;
  /**
   * When true and there are more than 3 items, collapses to
   * First > … > Last with a dropdown for the hidden middle items.
   */
  collapsible?: boolean;
}

const buttonStyle = (item: BreadcrumbItem): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  color: item.disabled ? '#475569' : item.active || item.onClick ? '#3b82f6' : '#e2e8f0',
  fontWeight: item.active ? 'bold' : 'normal',
  cursor: item.onClick && !item.disabled ? 'pointer' : 'default',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '14px',
  lineHeight: 1.4,
});

function Separator({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: '#475569', fontSize: '13px', userSelect: 'none' }}>
      {children}
    </span>
  );
}

export default function Breadcrumb({ items, separator = '>', style, collapsible }: BreadcrumbProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    ...style,
  };

  if (collapsible && items.length > 3) {
    const first = items[0];
    const last = items[items.length - 1];
    const hidden = items.slice(1, items.length - 1);

    return (
      <div style={containerStyle}>
        <button
          onClick={first.disabled ? undefined : first.onClick}
          disabled={!first.onClick || first.disabled}
          title={first.disabled ? 'You do not have access to this location' : undefined}
          style={buttonStyle(first)}
        >
          {first.label}
        </button>

        <Separator>{separator}</Separator>

        <ButtonMenu
          alignment="left"
          trigger={
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                lineHeight: 1.4,
              }}
            >
              &hellip;
            </button>
          }
          options={hidden.map((item) => ({
            label: item.label,
            icon: '',
            onClick: item.onClick ?? (() => {}),
          }))}
        />

        <Separator>{separator}</Separator>

        <button
          onClick={last.disabled ? undefined : last.onClick}
          disabled={!last.onClick || last.disabled}
          title={last.disabled ? 'You do not have access to this location' : undefined}
          style={buttonStyle(last)}
        >
          {last.label}
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {items.map((item, index) => (
        <React.Fragment key={`${index}-${item.label}`}>
          {index > 0 && <Separator>{separator}</Separator>}
          <button
            onClick={item.disabled ? undefined : item.onClick}
            disabled={!item.onClick || item.disabled}
            title={item.disabled ? 'You do not have access to this location' : undefined}
            style={buttonStyle(item)}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
