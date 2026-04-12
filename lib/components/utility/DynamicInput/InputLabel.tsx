'use client';

import styles from './DynamicInput.module.css';
import InfoTooltip from '../InfoTooltip';
import type { DynamicInputDefinition } from './types/dynamic-input-definition';

interface InputLabelProps {
  input: DynamicInputDefinition;
}

export default function InputLabel({ input }: InputLabelProps) {
  if (!input.label && !input.tooltip) return null;
  return (
    <label className={styles.label}>
      {input.label}
      {input.required && <span className={styles.required}>*</span>}
      {input.tooltip && <InfoTooltip text={input.tooltip} />}
    </label>
  );
}
