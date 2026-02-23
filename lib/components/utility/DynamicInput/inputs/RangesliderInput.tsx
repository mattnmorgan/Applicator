"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function RangesliderInput({ input, value, onChange }: DynamicInputProps) {
  const min = input.min !== undefined ? parseFloat(input.min) : 0;
  const max = input.max !== undefined ? parseFloat(input.max) : 100;
  const step = input.step !== undefined ? parseFloat(input.step) : 1;
  const current = typeof value === "number" ? value : min;

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <input
        type="range"
        className={styles.slider}
        value={current}
        onChange={(e) => onChange(input.id, parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={input.disabled}
      />
      <div className={styles.sliderValue}>
        {current} / {max}
      </div>
    </div>
  );
}
