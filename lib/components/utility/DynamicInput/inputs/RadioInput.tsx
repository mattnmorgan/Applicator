"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function RadioInput({ input, value, onChange }: DynamicInputProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.radioGroup}>
        {input.options?.map((opt) => (
          <div key={opt.value}>
            <label className={`${styles.radioOption} ${input.disabled ? styles.radioDisabled : ""}`}>
              <input
                type="radio"
                className={styles.radioInput}
                name={`radio-${input.id}`}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(input.id, opt.value)}
                disabled={input.disabled}
              />
              <span className={styles.radioLabel}>{opt.label}</span>
            </label>
            {opt.description && (
              <div className={styles.radioDescription}>{opt.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
