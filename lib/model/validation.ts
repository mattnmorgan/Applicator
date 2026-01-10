/**
 * Validation and formula execution engine for the generic data model
 */

import TableField from '@/lib/database/types/field';
import TableDefinition from '@/lib/database/types/tableDefinition';
import {
  FieldValidationResult,
  ValidationContext,
  FormulaContext,
} from '@/lib/model/types/validation';
import path from 'path';
import fs from 'fs';

/**
 * Execute a validator script for a field
 * @param appId The app ID
 * @param tableName The table name
 * @param field The field definition
 * @param value The value to validate
 * @param record The full record being validated
 * @returns Validation result
 */
export async function executeValidator(
  appId: string,
  tableName: string,
  field: TableField,
  value: any,
  record: Record<string, any>
): Promise<FieldValidationResult> {
  try {
    // Build the validator script path
    const validatorPath = path.join(
      process.cwd(),
      'apps',
      appId,
      'tables',
      tableName,
      field.name,
      'validator.ts'
    );

    // Check if validator exists
    if (!fs.existsSync(validatorPath)) {
      // No validator means field is valid
      return { field: field.name, valid: true };
    }

    // Load and execute the validator
    const validator = require(validatorPath);
    const validatorFn = validator.default || validator;

    if (typeof validatorFn !== 'function') {
      throw new Error('Validator must export a function');
    }

    const context: ValidationContext = {
      value,
      record,
      field,
    };

    const result = await validatorFn(context);

    if (typeof result !== 'boolean') {
      throw new Error('Validator must return a boolean');
    }

    return {
      field: field.name,
      valid: result,
      error: result ? undefined : `Validation failed for field ${field.name}`,
    };
  } catch (error) {
    return {
      field: field.name,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Execute a formula script for a field
 * @param appId The app ID
 * @param tableName The table name
 * @param field The field definition
 * @param record The full record for formula calculation
 * @returns Calculated value
 */
export async function executeFormula(
  appId: string,
  tableName: string,
  field: TableField,
  record: Record<string, any>
): Promise<any> {
  try {
    // Build the formula script path
    const formulaPath = path.join(
      process.cwd(),
      'apps',
      appId,
      'tables',
      tableName,
      field.name,
      'formula.ts'
    );

    // Check if formula exists
    if (!fs.existsSync(formulaPath)) {
      throw new Error(`Formula script not found for field ${field.name}`);
    }

    // Load and execute the formula
    const formula = require(formulaPath);
    const formulaFn = formula.default || formula;

    if (typeof formulaFn !== 'function') {
      throw new Error('Formula must export a function');
    }

    const context: FormulaContext = {
      record,
      field,
    };

    const result = await formulaFn(context);
    return result;
  } catch (error) {
    throw new Error(
      `Formula execution failed for field ${field.name}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Validate required fields in a record
 * @param table The table definition
 * @param data The record data
 * @returns Array of validation results for required fields
 */
export function validateRequiredFields(
  table: TableDefinition,
  data: Record<string, any>
): FieldValidationResult[] {
  const results: FieldValidationResult[] = [];

  for (const field of table.fields) {
    // Skip formula fields (they can't be required)
    if (field.type === 'formula') {
      continue;
    }

    if (field.required) {
      const value = data[field.name];
      const hasValue =
        value !== undefined && value !== null && value !== '';

      if (!hasValue) {
        results.push({
          field: field.name,
          valid: false,
          error: `Field ${field.name} is required`,
        });
      } else {
        results.push({
          field: field.name,
          valid: true,
        });
      }
    }
  }

  return results;
}

/**
 * Calculate all formula fields in a record
 * @param appId The app ID
 * @param tableName The table name
 * @param table The table definition
 * @param data The record data
 * @returns Updated record data with calculated formula values
 */
export async function calculateFormulas(
  appId: string,
  tableName: string,
  table: TableDefinition,
  data: Record<string, any>
): Promise<Record<string, any>> {
  const updatedData = { ...data };

  for (const field of table.fields) {
    if (field.type === 'formula') {
      const value = await executeFormula(appId, tableName, field, updatedData);
      updatedData[field.name] = value;
    }
  }

  return updatedData;
}

/**
 * Validate all fields with validators in a record
 * @param appId The app ID
 * @param tableName The table name
 * @param table The table definition
 * @param data The record data
 * @returns Array of validation results
 */
export async function validateFields(
  appId: string,
  tableName: string,
  table: TableDefinition,
  data: Record<string, any>
): Promise<FieldValidationResult[]> {
  const results: FieldValidationResult[] = [];

  for (const field of table.fields) {
    const value = data[field.name];
    const result = await executeValidator(
      appId,
      tableName,
      field,
      value,
      data
    );
    results.push(result);
  }

  return results;
}

/**
 * Validate and process a record according to the execution order:
 * 1. Check required fields
 * 2. Calculate formula fields
 * 3. Execute validator scripts
 *
 * @param appId The app ID
 * @param tableName The table name
 * @param table The table definition
 * @param data The record data
 * @param skipValidation Whether to skip validation
 * @returns Processed record data
 * @throws Error if validation fails
 */
export async function validateAndProcessRecord(
  appId: string,
  tableName: string,
  table: TableDefinition,
  data: Record<string, any>,
  skipValidation: boolean = false
): Promise<Record<string, any>> {
  let processedData = { ...data };

  if (!skipValidation) {
    // Step 1: Validate required fields
    const requiredResults = validateRequiredFields(table, processedData);
    const requiredFailures = requiredResults.filter((r) => !r.valid);

    if (requiredFailures.length > 0) {
      const errors = requiredFailures.map((r) => r.error).join(', ');
      throw new Error(`Required field validation failed: ${errors}`);
    }
  }

  // Step 2: Calculate formula fields
  processedData = await calculateFormulas(
    appId,
    tableName,
    table,
    processedData
  );

  if (!skipValidation) {
    // Step 3: Execute validator scripts
    const validationResults = await validateFields(
      appId,
      tableName,
      table,
      processedData
    );
    const validationFailures = validationResults.filter((r) => !r.valid);

    if (validationFailures.length > 0) {
      const errors = validationFailures.map((r) => r.error).join(', ');
      throw new Error(`Field validation failed: ${errors}`);
    }
  }

  return processedData;
}

/**
 * Get all related records that need formula recalculation
 * @param appId The app ID
 * @param tableName The table name
 * @param recordId The record ID that was modified
 * @param allTables Map of all tables by app:table key
 * @returns Array of related records to recalculate (app:table:id format)
 */
export async function getRelatedRecordsForRecalculation(
  appId: string,
  tableName: string,
  recordId: string,
  allTables: Map<string, { appId: string; table: TableDefinition }>
): Promise<Array<{ appId: string; tableName: string; recordId: string }>> {
  const relatedRecords: Array<{
    appId: string;
    tableName: string;
    recordId: string;
  }> = [];

  // Find all tables that have relationship fields pointing to this table
  const targetKey = `${appId}:${tableName}`;

  for (const [key, { appId: relatedAppId, table: relatedTable }] of allTables) {
    for (const field of relatedTable.fields) {
      if (field.type === 'relationship' && field.relatedTo === targetKey) {
        // This table has a relationship to our modified table
        // We would need to query all records in this table that reference our recordId
        // For now, we'll mark this as a placeholder for future implementation
        // In a real implementation, you'd query the database here
      }
    }
  }

  return relatedRecords;
}
