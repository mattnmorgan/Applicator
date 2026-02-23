"use client";

import { useState, useRef, useEffect } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function MultiselectInput({ input, value, onChange }: DynamicInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected: string[] = Array.isArray(value) ? value : [];
  const disabled = input.disabled ?? false;
  const searchable = input.searchable ?? false;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
    if (!open) setSearch("");
  }, [open, searchable]);

  function toggle(val: string) {
    if (disabled) return;
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(input.id, next);
  }

  const filtered = searchable
    ? (input.options ?? []).filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : (input.options ?? []);

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <div
        className={`${styles.multiSelectContainer} ${disabled ? styles.containerDisabled : ""}`}
        ref={ref}
      >
        <div
          className={styles.multiSelectTags}
          onClick={() => !disabled && setOpen(!open)}
          style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        >
          {selected.length === 0 && (
            <span className={styles.placeholder}>{input.placeholder ?? "Select..."}</span>
          )}
          {selected.map((val) => {
            const opt = input.options?.find((o) => o.value === val);
            return (
              <span key={val} className={styles.multiSelectTag}>
                {opt?.label || val}
                <button
                  className={styles.multiSelectTagRemove}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(val);
                  }}
                  disabled={disabled}
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
        {open && !disabled && (
          <div className={styles.multiSelectDropdown}>
            {searchable && (
              <div className={styles.dropdownSearchWrapper}>
                <input
                  ref={searchRef}
                  type="text"
                  className={styles.dropdownSearchInput}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            {filtered.length === 0 ? (
              <div className={styles.dropdownEmpty}>No results</div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={`${styles.multiSelectOption} ${
                    selected.includes(opt.value) ? styles.multiSelectOptionSelected : ""
                  }`}
                  onClick={() => toggle(opt.value)}
                >
                  <span className={styles.multiSelectOptionText}>{opt.label}</span>
                  {opt.description && (
                    <span className={styles.multiSelectOptionDesc}>{opt.description}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
