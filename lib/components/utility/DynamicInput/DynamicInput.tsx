"use client";

import type { CustomInputType } from "@/lib/database/types/custom-input";
import styles from "./DynamicInput.module.css";
import SelectInput from "./inputs/SelectInput";
import MultiselectInput from "./inputs/MultiselectInput";
import RadioInput from "./inputs/RadioInput";
import PseudoassigneeInput from "./inputs/PseudoassigneeInput";
import MultipseudoassigneeInput from "./inputs/MultipseudoassigneeInput";
import CheckboxInput from "./inputs/CheckboxInput";
import TextInput from "./inputs/TextInput";
import DateInput from "./inputs/DateInput";
import DatetimeInput from "./inputs/DatetimeInput";
import TimeInput from "./inputs/TimeInput";
import NumberInput from "./inputs/NumberInput";
import RangeInput from "./inputs/RangeInput";
import RangesliderInput from "./inputs/RangesliderInput";
import ColorInput from "./inputs/ColorInput";
import ChecklistInput from "./inputs/ChecklistInput";
import IconInput from "./inputs/IconInput";
import FileInput from "./inputs/FileInput";
import PasswordInput from "./inputs/PasswordInput";
import ToggleInput from "./inputs/ToggleInput";
import RadioHorizontalGroupInput from "./inputs/RadioHorizontalGroupInput";

export type { DynamicInputOption } from "./types/dynamic-input-option";
export type { DynamicInputDefinition } from "./types/dynamic-input-definition";

import type { DynamicInputDefinition } from "./types/dynamic-input-definition";

export interface DynamicInputProps {
  input: DynamicInputDefinition;
  value: any;
  onChange: (id: string, value: any) => void;
}

const INPUT_COMPONENTS: Record<
  CustomInputType,
  React.ComponentType<DynamicInputProps>
> = {
  select: SelectInput,
  multiselect: MultiselectInput,
  radio: RadioInput,
  pseudoassignee: PseudoassigneeInput,
  multipseudoassignee: MultipseudoassigneeInput,
  checkbox: CheckboxInput,
  text: TextInput,
  date: DateInput,
  datetime: DatetimeInput,
  time: TimeInput,
  number: NumberInput,
  range: RangeInput,
  rangeslider: RangesliderInput,
  color: ColorInput,
  checklist: ChecklistInput,
  icon: IconInput,
  file: FileInput,
  password: PasswordInput,
  toggle: ToggleInput,
  "radio-horizontal-group": RadioHorizontalGroupInput,
};

export default function DynamicInput({ input, value, onChange }: DynamicInputProps) {
  const Component = INPUT_COMPONENTS[input.type];

  if (!Component) {
    return (
      <div className={styles.wrapper}>
        <label className={styles.label}>
          {input.label}
          {input.required && <span className={styles.required}>*</span>}
        </label>
        <div style={{ color: "#ef4444", fontSize: "13px" }}>
          Unknown input type: {input.type}
        </div>
      </div>
    );
  }

  return <Component input={input} value={value} onChange={onChange} />;
}
