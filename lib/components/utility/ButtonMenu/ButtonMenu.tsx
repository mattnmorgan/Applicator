"use client";

import React, {
  useState,
  useRef,
  useEffect,
  ReactNode,
  cloneElement,
  isValidElement,
} from "react";
import { createPortal } from "react-dom";
import styles from "./ButtonMenu.module.css";
import Icon from "../Icon";

type ButtonMenuOption =
  | { type: "separator" }
  | {
      type?: "item";
      label: string;
      icon: ReactNode | string;
      onClick: () => void;
      active?: boolean;
      disabled?: boolean;
    };

interface ButtonMenuProps {
  children?: ReactNode;
  options?: ButtonMenuOption[];
  trigger?: ReactNode;
  disabled?: boolean;
  alignment?: "left" | "right";
  visibleOptions?: number;
}

// Height of a single menu item: 12px top padding + ~20px line height + 12px bottom padding
const ITEM_HEIGHT = 44;

export default function ButtonMenu({
  children,
  options,
  trigger,
  disabled = false,
  alignment = "right",
  visibleOptions,
}: ButtonMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    right: 0,
  });
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const updatePosition = () => {
        setMenuPosition({
          top: rect.bottom + window.scrollY + 4,
          left: alignment === "left" ? rect.left + window.scrollX : 0,
          right:
            alignment === "right"
              ? window.innerWidth - rect.right - window.scrollX
              : 0,
        });
      };
      updatePosition();

      // Also update on scroll/resize
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, alignment]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Use trigger prop if provided, otherwise use children (legacy API)
  const triggerElement = trigger || children;

  // Helper function to add rotation to caret SVGs in the trigger
  const addCaretRotation = (element: ReactNode): ReactNode => {
    if (!isValidElement(element)) return element;

    // Check if this is an SVG element (the caret)
    if (element.type === "svg") {
      return cloneElement(element as React.ReactElement<any>, {
        style: {
          ...((element.props as any).style || {}),
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        },
      });
    }

    // Recursively process children
    if ((element as any).props?.children) {
      return cloneElement(element as React.ReactElement<any>, {
        children: React.Children.map(
          (element as any).props.children,
          addCaretRotation,
        ),
      });
    }

    return element;
  };

  const triggerWithProps = addCaretRotation(triggerElement);

  const optionsList = options ? (
    options.map((option, index) =>
      option.type === "separator" ? (
        <div key={index} className={styles.separator} />
      ) : (
        <button
          key={index}
          onClick={option.disabled ? undefined : () => {
            option.onClick();
            setIsOpen(false);
          }}
          disabled={option.disabled}
          className={`${styles.menuItem} ${option.active ? styles.menuItemActive : ""} ${option.disabled ? styles.menuItemDisabled : ""}`}
        >
          <div className={styles.menuItemIcon}>
            {typeof option.icon === "string" ? (
              <Icon name={option.icon} />
            ) : (
              option.icon
            )}
          </div>
          <div>{option.label}</div>
        </button>
      ),
    )
  ) : (
    <div onClick={() => setIsOpen(false)}>{children}</div>
  );

  const dropdownContent = isOpen && !disabled && (
    <div
      ref={menuRef}
      className={styles.dropdown}
      style={{
        position: "fixed",
        top: `${menuPosition.top}px`,
        ...(alignment === "left"
          ? { left: `${menuPosition.left}px` }
          : { right: `${menuPosition.right}px` }),
      }}
    >
      <div
        style={
          visibleOptions != null
            ? { maxHeight: `${visibleOptions * ITEM_HEIGHT}px`, overflowY: "auto" }
            : undefined
        }
      >
        {optionsList}
      </div>
    </div>
  );

  return (
    <div className={styles.menuContainer}>
      <div
        ref={triggerRef}
        onClick={handleToggle}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${styles.trigger} ${disabled ? "" : isOpen || isHovered ? styles.triggerActive : styles.triggerDefault}`}
      >
        {triggerWithProps}
      </div>

      {mounted &&
        typeof window !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
