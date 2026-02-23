"use client";

import { useState } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

interface ChecklistItem {
  text: string;
  checked: boolean;
}

export default function ChecklistInput({ input, value, onChange }: DynamicInputProps) {
  const [newItem, setNewItem] = useState("");
  const items: ChecklistItem[] = Array.isArray(value) ? value : [];
  const disabled = input.disabled ?? false;

  function addItem() {
    if (disabled) return;
    const text = newItem.trim();
    if (!text) return;
    onChange(input.id, [...items, { text, checked: false }]);
    setNewItem("");
  }

  function toggleItem(index: number) {
    if (disabled) return;
    const next = items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item,
    );
    onChange(input.id, next);
  }

  function removeItem(index: number) {
    if (disabled) return;
    onChange(
      input.id,
      items.filter((_, i) => i !== index),
    );
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.checklist}>
        {items.map((item, i) => (
          <div key={i} className={styles.checklistItem}>
            <input
              type="checkbox"
              className={styles.checklistItemInput}
              checked={item.checked}
              onChange={() => toggleItem(i)}
              disabled={disabled}
            />
            <span
              className={`${styles.checklistItemText} ${
                item.checked ? styles.checklistItemTextChecked : ""
              }`}
            >
              {item.text}
            </span>
            <button
              className={styles.checklistRemove}
              onClick={() => removeItem(i)}
              type="button"
              disabled={disabled}
            >
              &times;
            </button>
          </div>
        ))}
        <div className={styles.checklistAdd}>
          <input
            type="text"
            className={`${styles.input} ${styles.checklistAddInput}`}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Add item..."
            disabled={disabled}
          />
          <button
            className={styles.checklistAddButton}
            onClick={addItem}
            type="button"
            disabled={disabled}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
