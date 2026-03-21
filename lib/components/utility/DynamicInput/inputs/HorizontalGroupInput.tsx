"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";
import Tooltip from "@/lib/components/utility/Tooltip";

export default function HorizontalGroupInput({ input, value, onChange }: DynamicInputProps) {
  const options = input.options ?? [];

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <div className={`${styles.horizontalGroup} ${input.disabled ? styles.containerDisabled : ""}`}>
        {options.map((opt, i) => {
          const isSelected = value === opt.value;
          const isFirst = i === 0;
          const isLast = i === options.length - 1;

          const button = (
            <button
              key={opt.value}
              type="button"
              onClick={() => !input.disabled && onChange(input.id, opt.value)}
              disabled={input.disabled}
              className={styles.horizontalGroupButton}
              style={{
                borderRadius: isFirst ? "6px 0 0 6px" : isLast ? "0 6px 6px 0" : "0",
                background: isSelected ? (opt.selectedColor ?? "#3b82f6") : "transparent",
                color: isSelected ? "#fff" : "#6b7280",
                borderRight: isLast ? undefined : "none",
              }}
            >
              {opt.label}
            </button>
          );

          return opt.description ? (
            <Tooltip key={opt.value} text={opt.description} placement="top">
              {button}
            </Tooltip>
          ) : button;
        })}
      </div>
    </div>
  );
}
