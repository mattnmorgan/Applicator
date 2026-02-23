"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function TextInput({ input, value, onChange }: DynamicInputProps) {
  const placeholder = input.placeholder ?? `Enter ${input.label.toLowerCase()}...`;
  const multiline = (input.lines ?? 1) > 1;

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      {multiline ? (
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          style={{ resize: input.resizable === false ? "none" : "vertical" }}
          rows={input.lines}
          value={value ?? ""}
          onChange={(e) => onChange(input.id, e.target.value)}
          placeholder={placeholder}
          disabled={input.disabled}
        />
      ) : (
        <input
          type="text"
          className={styles.input}
          value={value ?? ""}
          onChange={(e) => onChange(input.id, e.target.value)}
          placeholder={placeholder}
          disabled={input.disabled}
        />
      )}
    </div>
  );
}
