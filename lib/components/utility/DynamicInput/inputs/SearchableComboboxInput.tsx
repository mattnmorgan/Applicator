"use client";

import type { DynamicInputProps } from "../DynamicInput";
import type { DynamicInputOption } from "../types/dynamic-input-option";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";
import SearchableCombobox from "../../SearchableCombobox";

export default function SearchableComboboxInput({ input, value, onChange }: DynamicInputProps) {
  const opts: DynamicInputOption[] = input.options || [];
  const isMulti = !!input.multiSelect;

  const selectedItems = isMulti
    ? opts.filter((o) => Array.isArray(value) && (value as string[]).includes(o.value))
    : opts.filter((o) => o.value === value);

  const handleSelectionChange = (items: DynamicInputOption[]) => {
    if (isMulti) {
      onChange(input.id, items.map((i) => i.value));
    } else {
      onChange(input.id, items[0]?.value ?? "");
    }
  };

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />
      <SearchableCombobox
        items={opts}
        getItemKey={(o) => o.value}
        filterItem={(o, term) => o.label.toLowerCase().includes(term.toLowerCase())}
        renderItem={(o) => o.label}
        selectedItems={selectedItems}
        onSelectionChange={handleSelectionChange}
        multiSelect={isMulti}
        placeholder={input.placeholder}
        disabled={input.disabled}
      />
    </div>
  );
}
