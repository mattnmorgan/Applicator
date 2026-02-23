import type { ReactNode } from "react";
import type { CustomInputType } from "@/lib/database/types/custom-input";
import type { DynamicInputOption } from "./dynamic-input-option";

export interface DynamicInputDefinition {
  id: string;
  label: string;
  type: CustomInputType;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: string;
  decimalPlaces?: number;
  format?: string;
  placeholder?: string;
  /** Number of visible lines; 1 (default) renders an <input>, >1 renders a <textarea> (text type only) */
  lines?: number;
  /** Whether the textarea is resizable (text type only, requires lines > 1) */
  resizable?: boolean;
  options?: DynamicInputOption[];
  /** Enables live search/filter in the dropdown (select, multiselect, pseudoassignee, multipseudoassignee) */
  searchable?: boolean;
  /** Custom renderer for items in the search/dropdown list (pseudoassignee, multipseudoassignee) */
  renderSearchItem?: (opt: DynamicInputOption) => ReactNode;
  /** Custom renderer for selected pills / selected value display (pseudoassignee, multipseudoassignee) */
  renderPill?: (opt: DynamicInputOption) => ReactNode;
}
