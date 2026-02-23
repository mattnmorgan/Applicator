"use client";

import { useState, useRef, useEffect } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import type { DynamicInputOption } from "../types/dynamic-input-option";
import styles from "../DynamicInput.module.css";

function defaultRenderPill(opt: DynamicInputOption) {
  return (
    <span className={styles.pseudoOption}>
      {opt.icon && (
        <img src={opt.icon} alt="" className={styles.pseudoIcon} />
      )}
      {opt.label}
    </span>
  );
}

function defaultRenderSearchItem(opt: DynamicInputOption) {
  return (
    <>
      {opt.icon && (
        <img src={opt.icon} alt="" className={styles.multiSelectOptionIcon} />
      )}
      <div>
        <div className={styles.multiSelectOptionText}>{opt.label}</div>
        {opt.description && (
          <div className={styles.multiSelectOptionDesc}>{opt.description}</div>
        )}
      </div>
    </>
  );
}

export default function PseudoassigneeInput({ input, value, onChange }: DynamicInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const disabled = input.disabled ?? false;
  const searchable = input.searchable ?? false;
  const placeholder = input.placeholder ?? "Select...";
  const renderPill = input.renderPill ?? defaultRenderPill;
  const renderSearchItem = input.renderSearchItem ?? defaultRenderSearchItem;

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

  const selectedOpt = input.options?.find((o) => o.value === value);

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
          {selectedOpt ? (
            renderPill(selectedOpt)
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
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
                    value === opt.value ? styles.multiSelectOptionSelected : ""
                  }`}
                  onClick={() => {
                    onChange(input.id, opt.value);
                    setOpen(false);
                  }}
                >
                  {renderSearchItem(opt)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
