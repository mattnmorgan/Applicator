"use client";

import { useState, useRef, useEffect } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function SelectInput({ input, value, onChange }: DynamicInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
    if (!open) setSearch("");
  }, [open]);

  if (!searchable) {
    return (
      <div className={styles.wrapper}>
        <label className={styles.label}>
          {input.label}
          {input.required && <span className={styles.required}>*</span>}
        </label>
        <select
          className={`${styles.input} ${styles.select}`}
          value={value ?? ""}
          onChange={(e) => onChange(input.id, e.target.value || null)}
          disabled={disabled}
        >
          <option value="">{input.placeholder ?? "Select..."}</option>
          {input.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const selectedOpt = input.options?.find((o) => o.value === value);
  const filtered = (input.options ?? []).filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

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
          className={`${styles.multiSelectTags} ${styles.selectTrigger}`}
          onClick={() => !disabled && setOpen(!open)}
          style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        >
          {selectedOpt ? (
            <span>{selectedOpt.label}</span>
          ) : (
            <span className={styles.placeholder}>{input.placeholder ?? "Select..."}</span>
          )}
        </div>
        {open && !disabled && (
          <div className={styles.multiSelectDropdown}>
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
            {filtered.length === 0 ? (
              <div className={styles.dropdownEmpty}>No results</div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={`${styles.multiSelectOption} ${
                    value === opt.value ? styles.multiSelectOptionSelected : ""
                  }`}
                  onClick={() => {
                    onChange(input.id, opt.value);
                    setOpen(false);
                  }}
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
