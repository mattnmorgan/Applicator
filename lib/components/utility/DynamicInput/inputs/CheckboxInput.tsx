"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InfoTooltip from "../../InfoTooltip";

export default function CheckboxInput({ input, value, onChange }: DynamicInputProps) {
  return (
    <div className={styles.wrapper}>
      <label className={`${styles.checkbox} ${input.disabled ? styles.checkboxDisabled : ""}`}>
        <input
          type="checkbox"
          className={styles.checkboxInput}
          checked={!!value}
          onChange={(e) => onChange(input.id, e.target.checked)}
          disabled={input.disabled}
        />
        <span className={styles.checkboxLabel}>{input.label}</span>
        {input.required && <span className={styles.required}>*</span>}
        {input.tooltip && <InfoTooltip text={input.tooltip} />}
      </label>
    </div>
  );
}
