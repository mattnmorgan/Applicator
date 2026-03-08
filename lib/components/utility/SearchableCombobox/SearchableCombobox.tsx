import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./SearchableCombobox.module.css";

export interface SearchableComboboxProps<T> {
  items: T[];
  renderItem: (item: T, context: "dropdown" | "pill") => React.ReactNode;
  filterItem: (item: T, searchTerm: string) => boolean;
  selectedItems: T[];
  onSelectionChange: (items: T[]) => void;
  getItemKey: (item: T) => string;
  multiSelect?: boolean;
  placeholder?: string;
  minSearchLength?: number;
  debounceMs?: number;
  onSearchChange?: (term: string) => void;
  disabled?: boolean;
}

export default function SearchableCombobox<T>({
  items,
  renderItem,
  filterItem,
  selectedItems,
  onSelectionChange,
  getItemKey,
  multiSelect = false,
  placeholder = "Search...",
  minSearchLength = 0,
  debounceMs = 0,
  onSearchChange,
  disabled = false,
}: SearchableComboboxProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Scroll pills area to end and check overflow when selection changes
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
      setHasOverflow(el.scrollWidth > el.offsetWidth);
    }
  }, [selectedItems.length]);

  // Remap vertical wheel to horizontal scroll
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.offsetWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Debounce the search term and notify parent
  useEffect(() => {
    if (debounceMs <= 0) {
      setDebouncedTerm(searchTerm);
      onSearchChange?.(searchTerm);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      onSearchChange?.(searchTerm);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const selectedKeys = new Set(selectedItems.map(getItemKey));

  const activeSearch = debouncedTerm.length >= minSearchLength ? debouncedTerm : "";
  const filteredItems = activeSearch
    ? items.filter((item) => filterItem(item, activeSearch))
    : minSearchLength > 0
      ? []
      : items;

  useEffect(() => { setMounted(true); }, []);

  // Compute portal dropdown position whenever it opens
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    if (disabled) return;
    const key = getItemKey(item);
    if (multiSelect) {
      if (selectedKeys.has(key)) {
        onSelectionChange(selectedItems.filter((s) => getItemKey(s) !== key));
      } else {
        onSelectionChange([...selectedItems, item]);
        setSearchTerm("");
      }
    } else {
      if (selectedKeys.has(key)) {
        onSelectionChange([]);
      } else {
        onSelectionChange([item]);
      }
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleRemove = (item: T) => {
    if (disabled) return;
    onSelectionChange(
      selectedItems.filter((s) => getItemKey(s) !== getItemKey(item)),
    );
  };

  const handleClearAll = () => {
    if (disabled) return;
    onSelectionChange([]);
    setSearchTerm("");
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", opacity: disabled ? 0.5 : 1, width: "100%" }}
    >
      {/* Input container with inline pills */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "4px",
          minHeight: "38px",
          overflow: "hidden",
          cursor: disabled ? "not-allowed" : "text",
        }}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
      >
        {/* Scrollable pills + input area */}
        <div
          ref={scrollAreaRef}
          className={styles.scrollArea}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            overflowY: "hidden",
            padding: "4px 8px",
            maskImage: hasOverflow
              ? "linear-gradient(to right, black calc(100% - 24px), transparent 100%)"
              : undefined,
            WebkitMaskImage: hasOverflow
              ? "linear-gradient(to right, black calc(100% - 24px), transparent 100%)"
              : undefined,
          }}
        >
          {selectedItems.map((item) => (
            <div
              key={getItemKey(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "#334155",
                borderRadius: "12px",
                padding: "2px 8px 2px 10px",
                fontSize: "12px",
                color: "#e2e8f0",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span>{renderItem(item, "pill")}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item);
                }}
                disabled={disabled}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: disabled ? "not-allowed" : "pointer",
                  padding: "0 0 0 2px",
                  fontSize: "13px",
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            disabled={disabled}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => { if (!disabled) setIsOpen(true); }}
            placeholder={selectedItems.length === 0 ? placeholder : ""}
            style={{
              flex: 1,
              minWidth: "60px",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f1f5f9",
              fontSize: "14px",
              cursor: disabled ? "not-allowed" : "text",
              padding: "0",
            }}
          />
        </div>

        {/* Clear all button */}
        {selectedItems.length > 0 && !disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
            }}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0 10px",
              fontSize: "16px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              alignSelf: "stretch",
            }}
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown — portal-rendered to escape modal overflow clipping */}
      {mounted && isOpen && !disabled && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "4px",
            maxHeight: "200px",
            overflow: "auto",
            zIndex: 9999,
          }}
        >
          {minSearchLength > 0 && debouncedTerm.length < minSearchLength ? (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Type at least {minSearchLength} characters to search
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              No items found
            </div>
          ) : (
            filteredItems.map((item) => {
              const key = getItemKey(item);
              const isSelected = selectedKeys.has(key);
              return (
                <div
                  key={key}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    background: isSelected
                      ? "rgba(59, 130, 246, 0.15)"
                      : "transparent",
                    borderBottom: "1px solid #334155",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#334155";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected
                      ? "rgba(59, 130, 246, 0.15)"
                      : "transparent";
                  }}
                >
                  {multiSelect && (
                    <span
                      style={{
                        color: isSelected ? "#3b82f6" : "#64748b",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {isSelected ? "☑" : "☐"}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item, "dropdown")}</div>
                  {!multiSelect && isSelected && (
                    <span style={{ color: "#3b82f6", fontSize: "14px", flexShrink: 0 }}>
                      ✓
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      , document.body)}
    </div>
  );
}
