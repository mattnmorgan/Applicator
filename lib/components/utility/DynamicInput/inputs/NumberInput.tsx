"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function NumberInput({ input, value, onChange }: DynamicInputProps) {
  function handleChange(raw: string) {
    if (raw === "") {
      onChange(input.id, null);
      return;
    }
    let num = parseFloat(raw);
    if (isNaN(num)) return;
    if (input.decimalPlaces !== undefined) {
      num = parseFloat(num.toFixed(input.decimalPlaces));
    }
    onChange(input.id, num);
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <input
        type="number"
        className={styles.input}
        value={value ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        min={input.min}
        max={input.max}
        step={
          input.decimalPlaces !== undefined
            ? String(Math.pow(10, -input.decimalPlaces))
            : input.step || "any"
        }
        placeholder={input.placeholder ?? `Enter ${input.label.toLowerCase()}...`}
        disabled={input.disabled}
      />
    </div>
  );
}
