"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function ColorInput({ input, value, onChange }: DynamicInputProps) {
  const color = typeof value === "string" && value ? value : "#000000";

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.colorRow}>
        <input
          type="color"
          className={styles.colorInput}
          value={color}
          onChange={(e) => onChange(input.id, e.target.value)}
          disabled={input.disabled}
          style={{ cursor: input.disabled ? "not-allowed" : undefined }}
        />
        <span className={styles.colorHex}>{color.toUpperCase()}</span>
      </div>
    </div>
  );
}
