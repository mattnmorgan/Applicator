"use client";

import { useRef, useEffect } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";

export default function NumberInput({ input, value, onChange }: DynamicInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef({ value, input, onChange });
  stateRef.current = { value, input, onChange };

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

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { value, input, onChange } = stateRef.current;
      const step =
        input.decimalPlaces !== undefined
          ? Math.pow(10, -input.decimalPlaces)
          : parseFloat(input.step || "1") || 1;
      const current = value !== null && value !== undefined ? Number(value) : 0;
      let next = e.deltaY < 0 ? current + step : current - step;
      if (input.min !== undefined) next = Math.max(parseFloat(input.min), next);
      if (input.max !== undefined) next = Math.min(parseFloat(input.max), next);
      if (input.decimalPlaces !== undefined) {
        next = parseFloat(next.toFixed(input.decimalPlaces));
      }
      onChange(input.id, next);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <input
        ref={inputRef}
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
