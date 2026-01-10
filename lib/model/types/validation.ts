/**
 * Validation-related types for the generic data model
 */

import TableField from '@/lib/database/types/field';

/**
 * Validation result for a field
 */
export interface FieldValidationResult {
  field: string;
  valid: boolean;
  error?: string;
}

/**
 * Validation context passed to validator scripts
 */
export interface ValidationContext {
  /** The field value being validated */
  value: any;

  /** The entire record being validated */
  record: Record<string, any>;

  /** Field definition */
  field: TableField;
}

/**
 * Formula context passed to formula scripts
 */
export interface FormulaContext {
  /** The entire record for formula calculation */
  record: Record<string, any>;

  /** Field definition */
  field: TableField;
}
