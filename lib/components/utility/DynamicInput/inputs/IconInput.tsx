"use client";

import { useRef } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";

const MAX_SIZE = 1024 * 1024; // 1 MB

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
      <label className={styles.label}>
        {input.label}
        {input.required && <span className={styles.required}>*</span>}
      </label>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: "none" }}
        onChange={handleFile}
        disabled={disabled}
      />
      {value ? (
        <div className={styles.iconPreview}>
          <img src={value} alt="icon" className={styles.iconImage} />
          <button
            className={styles.fileButton}
            onClick={() => fileRef.current?.click()}
            type="button"
            disabled={disabled}
          >
            Change
          </button>
          <button
            className={styles.iconRemove}
            onClick={() => onChange(input.id, null)}
            type="button"
            disabled={disabled}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          className={styles.fileButton}
          onClick={() => fileRef.current?.click()}
          type="button"
          disabled={disabled}
        >
          Select Image
        </button>
      )}
    </div>
  );
}
