"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function DatetimeInput({ input, value, onChange }: DynamicInputProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
        {input.format && (
          <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 6 }}>
            ({input.format})
          </span>
        )}
      </label>
      <input
        type="datetime-local"
        className={styles.input}
        value={value ?? ""}
        onChange={(e) => onChange(input.id, e.target.value)}
        disabled={input.disabled}
      />
    </div>
  );
}
