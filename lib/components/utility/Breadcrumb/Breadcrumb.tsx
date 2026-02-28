import React from 'react';

export interface BreadcrumbItem {
  label: string;
  /** If provided, the item is clickable */
  onClick?: () => void;
  /** Mark as the current/active location — renders bold + blue */
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Separator between items. Defaults to ">" */
  separator?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function Breadcrumb({ items, separator = '>', style }: BreadcrumbProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', ...style }}>
      {items.map((item, index) => (
        <React.Fragment key={`${index}-${item.label}`}>
          {index > 0 && (
            <span style={{ color: '#475569', fontSize: '13px', userSelect: 'none' }}>
              {separator}
            </span>
          )}
          <button
            onClick={item.onClick}
            disabled={!item.onClick}
            style={{
              background: 'none',
              border: 'none',
              color: item.active || item.onClick ? '#3b82f6' : '#e2e8f0',
              fontWeight: item.active ? 'bold' : 'normal',
              cursor: item.onClick ? 'pointer' : 'default',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              lineHeight: 1.4,
            }}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
