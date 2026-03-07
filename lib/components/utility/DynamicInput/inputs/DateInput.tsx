"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InfoTooltip from "../../InfoTooltip";

export default function DateInput({ input, value, onChange }: DynamicInputProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
        {input.format && (
          <span style={{ fontWeight: 400, color: "#64748b" }}>
            ({input.format})
          </span>
        )}
        {input.tooltip && <InfoTooltip text={input.tooltip} />}
      </label>
      <input
        type="date"
        className={styles.input}
        value={value ?? ""}
        onChange={(e) => onChange(input.id, e.target.value)}
        disabled={input.disabled}
      />
    </div>
  );
}
