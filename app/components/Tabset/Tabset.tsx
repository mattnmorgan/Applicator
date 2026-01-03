'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Tabset.module.css';

export interface TabsetItem {
  label: string;
  path?: string;
  children?: TabsetItem[];
  clickable?: boolean;
}

interface TabsetProps {
  items: TabsetItem[];
  variant?: 'vertical' | 'horizontal';
  searchable?: boolean;
  autoExpand?: boolean;
}

interface TreeItemProps {
  item: TabsetItem;
  currentPath: string;
  searchTerm: string;
  onNavigate: (path: string) => void;
  autoExpand?: boolean;
}

function TreeItem({ item, currentPath, searchTerm, onNavigate, autoExpand = false }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const hasChildren = item.children && item.children.length > 0;
  const isClickable = item.clickable !== false && item.path !== undefined;
  const isActive = item.path === currentPath;

  // Filter children based on search term
  const getFilteredChildren = () => {
    if (!hasChildren || !searchTerm) return item.children;

    return item.children!.filter(child => {
      const matchesLabel = child.label.toLowerCase().includes(searchTerm.toLowerCase());
      const hasMatchingChildren = child.children?.some(grandchild =>
        grandchild.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchesLabel || hasMatchingChildren;
    });
  };

  const filteredChildren = getFilteredChildren();
  const shouldShow = !searchTerm ||
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (filteredChildren && filteredChildren.length > 0);

  if (!shouldShow) return null;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (isClickable && item.path) {
      onNavigate(item.path);
    }
  };

  return (
    <div className={styles.treeItem}>
      <div
        className={`
          ${styles.itemContent}
          ${isActive ? styles.itemContentActive : ''}
          ${!isClickable ? styles.itemContentNonClickable : ''}
        `}
        onClick={handleClick}
      >
        {hasChildren && (
          <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconExpanded : styles.expandIconCollapsed}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M4 2L8 6L4 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        {!hasChildren && <span style={{ width: '16px' }} />}
        <span>{item.label}</span>
      </div>
      {hasChildren && isExpanded && filteredChildren && filteredChildren.length > 0 && (
        <div className={styles.children}>
          {filteredChildren.map((child, index) => (
            <TreeItem
              key={index}
              item={child}
              currentPath={currentPath}
              searchTerm={searchTerm}
              onNavigate={onNavigate}
              autoExpand={autoExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Tabset({ items, variant = 'vertical', searchable = false, autoExpand = false }: TabsetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState('');

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  if (variant === 'horizontal') {
    return (
      <div className={styles.tabsetHorizontal}>
        {items.map((item, index) => {
          const isActive = item.path === pathname;
          const isClickable = item.clickable !== false && item.path !== undefined;

          return (
            <div
              key={index}
              className={`${styles.horizontalTab} ${isActive ? styles.horizontalTabActive : ''}`}
              onClick={() => isClickable && item.path && handleNavigate(item.path)}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.tabsetVertical}>
      {searchable && (
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}
      {items.map((item, index) => (
        <TreeItem
          key={index}
          item={item}
          currentPath={pathname}
          searchTerm={searchTerm}
          onNavigate={handleNavigate}
          autoExpand={autoExpand}
        />
      ))}
    </div>
  );
}
