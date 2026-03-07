"use client";

import { useRef } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";

export default function FileInput({ input, value, onChange }: DynamicInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const disabled = input.disabled ?? false;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    onChange(input.id, {
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    });

    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleClear() {
    onChange(input.id, null);
  }

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <input
        ref={fileRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleFile}
        disabled={disabled}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          className={styles.fileButton}
          onClick={() => fileRef.current?.click()}
          type="button"
          disabled={disabled}
        >
          {value?.name ? "Change File" : "Select File"}
        </button>
        {value?.name && (
          <button
            className={styles.iconRemove}
            onClick={handleClear}
            type="button"
            disabled={disabled}
            title="Clear file"
          >
            Clear
          </button>
        )}
      </div>
      {value?.name && (
        <div className={styles.fileName}>
          {value.name} ({(value.size / 1024).toFixed(1)} KB)
        </div>
      )}
    </div>
  );
}
