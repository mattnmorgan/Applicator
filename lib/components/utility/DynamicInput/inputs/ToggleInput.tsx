"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";

export default function ToggleInput({ input, value, onChange }: DynamicInputProps) {
  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <label className={`${styles.toggle} ${input.disabled ? styles.toggleDisabled : ""}`}>
        <input
          type="checkbox"
          className={styles.toggleInput}
          checked={!!value}
          onChange={(e) => onChange(input.id, e.target.checked)}
          disabled={input.disabled}
        />
        <span className={styles.toggleTrack} />
      </label>
    </div>
  );
}
