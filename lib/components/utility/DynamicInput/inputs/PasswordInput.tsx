"use client";

import { useState } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";

export default function PasswordInput({ input, value, onChange }: DynamicInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <div className={styles.passwordRow}>
        <input
          type={show ? "text" : "password"}
          className={`${styles.input} ${styles.passwordInput}`}
          value={value ?? ""}
          onChange={(e) => onChange(input.id, e.target.value)}
          placeholder={input.placeholder ?? `Enter ${input.label.toLowerCase()}...`}
          disabled={input.disabled}
          autoComplete="current-password"
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setShow(!show)}
          disabled={input.disabled}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
