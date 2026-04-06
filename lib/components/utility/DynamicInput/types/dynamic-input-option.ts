export interface DynamicInputOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  /** Background color applied to the button when this option is selected (horizontalGroup and badge-multiselect types) */
  selectedColor?: string;
  /** Foreground/text color applied to the badge when selected (badge-multiselect type) */
  fgColor?: string;
}
