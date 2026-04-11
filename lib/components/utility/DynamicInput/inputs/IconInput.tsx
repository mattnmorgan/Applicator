"use client";

import { useRef } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";

const MAX_SIZE = 1024 * 1024; // 1 MB
const PREVIEW_SIZE = 64;
const PREVIEW_RADIUS = 10;

export default function IconInput({ input, value, onChange }: DynamicInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const disabled = input.disabled ?? false;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      alert("Image must be under 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(input.id, reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: "none" }}
        onChange={handleFile}
        disabled={disabled}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {value ? (
          <img
            src={value}
            alt="icon"
            style={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              borderRadius: PREVIEW_RADIUS,
              objectFit: "cover",
              border: "1px solid #334155",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              borderRadius: PREVIEW_RADIUS,
              background: "#1e293b",
              border: "1px solid #334155",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "#475569",
            }}
          >
            None
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            style={{
              padding: "5px 12px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 12,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            Choose Image
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(input.id, null)}
              disabled={disabled}
              style={{
                padding: "5px 10px",
                background: "transparent",
                border: "1px solid #334155",
                borderRadius: 6,
                color: "#94a3b8",
                fontSize: 12,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
