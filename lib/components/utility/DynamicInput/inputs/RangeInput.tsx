"use client";

import { useRef, useEffect } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function RangeInput({ input, value, onChange }: DynamicInputProps) {
  const min = input.min !== undefined ? parseFloat(input.min) : 0;
  const max = input.max !== undefined ? parseFloat(input.max) : 100;
  const step = input.step !== undefined ? parseFloat(input.step) : 1;
  const current = typeof value === "number" ? value : min;
  const disabled = input.disabled ?? false;

  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef({ current, min, max, step, disabled, input, onChange });
  stateRef.current = { current, min, max, step, disabled, input, onChange };

  function increment() {
    const next = Math.min(current + step, max);
    onChange(input.id, parseFloat(next.toFixed(10)));
  }

  function decrement() {
    const next = Math.max(current - step, min);
    onChange(input.id, parseFloat(next.toFixed(10)));
  }

  function handleInput(raw: string) {
    if (raw === "") {
      onChange(input.id, min);
      return;
    }
    let num = parseFloat(raw);
    if (isNaN(num)) return;
    num = Math.max(min, Math.min(max, num));
    onChange(input.id, num);
  }

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { current, min, max, step, disabled, input, onChange } = stateRef.current;
      if (disabled) return;
      const next = e.deltaY < 0
        ? Math.min(current + step, max)
        : Math.max(current - step, min);
      onChange(input.id, parseFloat(next.toFixed(10)));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.rangeRow}>
        <button
          className={styles.rangeButton}
          onClick={decrement}
          disabled={disabled || current <= min}
          type="button"
        >
          &minus;
        </button>
        <input
          ref={inputRef}
          type="number"
          className={`${styles.input} ${styles.rangeValue} ${styles.rangeValueInput}`}
          value={current}
          onChange={(e) => handleInput(e.target.value)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />
        <button
          className={styles.rangeButton}
          onClick={increment}
          disabled={disabled || current >= max}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}
