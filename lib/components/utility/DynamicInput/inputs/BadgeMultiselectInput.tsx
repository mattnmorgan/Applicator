"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";

export default function BadgeMultiselectInput({ input, value, onChange }: DynamicInputProps) {
  const selected: string[] = Array.isArray(value) ? value : [];
  const disabled = input.disabled ?? false;

  const options = [...(input.options ?? [])].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const toggle = (optValue: string) => {
    if (disabled) return;
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange(input.id, next);
  };

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.length === 0 && (
          <span style={{ fontSize: 12, color: "#64748b" }}>No options</span>
        )}
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          const bg = isSelected ? (opt.selectedColor || "#3b82f6") : "#1e293b";
          const fg = isSelected ? (opt.fgColor || "#fff") : "#94a3b8";
          const border = isSelected ? `2px solid ${opt.selectedColor || "#3b82f6"}` : "1px solid #334155";
          return (
            <span
              key={opt.value}
              onClick={() => toggle(opt.value)}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 12,
                cursor: disabled ? "default" : "pointer",
                background: bg,
                color: fg,
                border,
                userSelect: "none",
                transition: "background 0.12s, border-color 0.12s",
              }}
            >
              {opt.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
