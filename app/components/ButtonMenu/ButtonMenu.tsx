'use client';

import { useState, useRef, useEffect, ReactNode, cloneElement, isValidElement } from 'react';
import styles from './ButtonMenu.module.css';

interface ButtonMenuProps {
  children: ReactNode;
  options: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
  }[];
}

export default function ButtonMenu({ children, options }: ButtonMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Clone children and pass isOpen prop if it's a valid React element
  const childrenWithProps = isValidElement(children)
    ? cloneElement(children as React.ReactElement<any>, { isOpen })
    : children;

  return (
    <div ref={menuRef} className={styles.menuContainer}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${styles.trigger} ${isOpen || isHovered ? styles.triggerActive : styles.triggerDefault}`}
      >
        {childrenWithProps}
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                option.onClick();
                setIsOpen(false);
              }}
              className={styles.menuItem}
            >
              <span className={styles.menuItemIcon}>
                {option.icon}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
