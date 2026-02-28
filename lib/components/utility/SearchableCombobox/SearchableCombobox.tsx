import React, { useState, useRef, useEffect } from "react";

export interface SearchableComboboxProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  filterItem: (item: T, searchTerm: string) => boolean;
  selectedItems: T[];
  onSelectionChange: (items: T[]) => void;
  getItemKey: (item: T) => string;
  multiSelect?: boolean;
  placeholder?: string;
  renderSelected?: (item: T) => React.ReactNode;
  minSearchLength?: number;
  debounceMs?: number;
  onSearchChange?: (term: string) => void;
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
  renderSelected,
  minSearchLength = 0,
  debounceMs = 0,
  onSearchChange,
}: SearchableComboboxProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    const key = getItemKey(item);
    if (multiSelect) {
      if (selectedKeys.has(key)) {
        onSelectionChange(
          selectedItems.filter((s) => getItemKey(s) !== key),
        );
      } else {
        onSelectionChange([...selectedItems, item]);
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
    onSelectionChange(
      selectedItems.filter((s) => getItemKey(s) !== getItemKey(item)),
    );
  };

  const handleClearAll = () => {
    onSelectionChange([]);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Selected items display */}
      {selectedItems.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            marginBottom: "8px",
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
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "13px",
                color: "#e2e8f0",
              }}
            >
              <span>
                {renderSelected ? renderSelected(item) : renderItem(item)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: "14px",
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
          <button
            onClick={handleClearAll}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px 6px",
              fontSize: "12px",
            }}
            title="Clear all"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "8px",
            paddingRight: selectedItems.length > 0 ? "32px" : "8px",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "4px",
            color: "#f1f5f9",
            boxSizing: "border-box",
            fontSize: "14px",
          }}
        />
        {selectedItems.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0",
              fontSize: "16px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "4px",
            marginTop: "4px",
            maxHeight: "200px",
            overflow: "auto",
            zIndex: 10,
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
                  <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</div>
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
      )}
    </div>
  );
}
