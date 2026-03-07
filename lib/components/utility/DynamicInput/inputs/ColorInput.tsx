"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";

export default function ColorInput({ input, value, onChange }: DynamicInputProps) {
  const color = typeof value === "string" && value ? value : "#000000";

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
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
