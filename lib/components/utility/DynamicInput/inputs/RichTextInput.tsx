"use client";

import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";
import RichTextEditor from "../../RichTextEditor/RichTextEditor";

export default function RichTextInput({ input, value, onChange }: DynamicInputProps) {
  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <RichTextEditor
        value={value ?? ""}
        onChange={(html) => onChange(input.id, html)}
        placeholder={input.placeholder}
        disabled={input.disabled}
      />
    </div>
  );
}
