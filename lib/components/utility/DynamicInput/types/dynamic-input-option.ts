export interface DynamicInputOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  /** Background color applied to the button when this option is selected (horizontalGroup type) */
  selectedColor?: string;
}
