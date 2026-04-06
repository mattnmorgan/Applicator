export type CustomInputType =
  | "select"
  | "multiselect"
  | "radio"
  | "pseudoassignee"
  | "multipseudoassignee"
  | "checkbox"
  | "text"
  | "date"
  | "datetime"
  | "time"
  | "number"
  | "range"
  | "rangeslider"
  | "color"
  | "checklist"
  | "icon"
  | "file"
  | "password"
  | "toggle"
  | "radio-horizontal-group"
  | "richtext"
  | "badge-multiselect";

export default interface CustomInput {
  app: string;
  label: string;
  type: CustomInputType;
  default_value?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  decimal_places?: number;
  format?: string;
}
