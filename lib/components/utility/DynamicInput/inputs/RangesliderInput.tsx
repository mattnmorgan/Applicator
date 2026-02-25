"use client";

import { useRef, useEffect } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

export default function RangesliderInput({ input, value, onChange }: DynamicInputProps) {
  const min = input.min !== undefined ? parseFloat(input.min) : 0;
  const max = input.max !== undefined ? parseFloat(input.max) : 100;
  const step = input.step !== undefined ? parseFloat(input.step) : 1;
  const current = typeof value === "number" ? value : min;

  const sliderRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef({ current, min, max, step, input, onChange });
  stateRef.current = { current, min, max, step, input, onChange };

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { current, min, max, step, input, onChange } = stateRef.current;
      if (input.disabled) return;
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
      <input
        ref={sliderRef}
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
