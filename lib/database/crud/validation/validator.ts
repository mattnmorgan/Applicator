import Field from "@/lib/database/types/field";
import Result from "@/lib/database/crud/validation/types/validator-result";
import Context from "@/lib/database/crud/validation/types/validator-context";
import path from "path";
import fs from "fs";
import vm from "vm";

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
  field: Field,
  value: any,
  record: Record<string, any>
): Promise<Result> {
  try {
    // Get system storage path (lazy import to avoid circular dependency)
    const { default: SettingManager } = await import(
      "@/lib/database/managers/setting"
    );
    const storagePath = (await new SettingManager().readRecord("storage"))?.data
      .value;
    if (!storagePath) {
      throw new Error("System storage not configured");
    }

    // Build the validator script path from system storage
    const validatorPath = path.join(
      storagePath,
      "apps",
      appId,
      "tables",
      tableName,
      field.name,
      "validator.js"
    );

    // Check if validator exists
    if (!fs.existsSync(validatorPath)) {
      // No validator means field is valid
      return { field: field.name, valid: true };
    }

    // Read and execute the validator script using vm
    const scriptCode = fs.readFileSync(validatorPath, "utf8");

    // Create a sandbox context with the validation context
    const context: Context = {
      value,
      record,
      field,
    };

    const sandbox: any = {
      module: { exports: {} },
      exports: {},
      require: require,
      console: console,
      context,
    };

    // Execute the script in the sandbox
    vm.createContext(sandbox);
    vm.runInContext(scriptCode, sandbox);

    // Get the exported function
    const validatorFn =
      sandbox.module.exports.default ||
      sandbox.module.exports ||
      sandbox.exports;

    if (typeof validatorFn !== "function") {
      throw new Error("Validator must export a function");
    }

    const result = await validatorFn(context);

    if (typeof result !== "boolean") {
      throw new Error("Validator must return a boolean");
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
      error:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}

/**
 * Validate all fields with validators in a record
 * @param appId The app ID
 * @param tableName The table name
 * @param fields The table field definitions
 * @param data The record data
 * @returns Array of validation results
 */
export async function validateFields(
  appId: string,
  tableName: string,
  fields: Field[],
  data: Record<string, any>
): Promise<Result[]> {
  const results: Result[] = [];

  for (const field of fields) {
    const value = data[field.name];
    const result = await executeValidator(appId, tableName, field, value, data);
    results.push(result);
  }

  return results;
}

/**
 * Validate required fields in a record
 * @param fields The table field definitions
 * @param data The record data
 * @returns Array of validation results for required fields
 */
export async function validateRequiredFields(
  fields: Field[],
  data: Record<string, any>
): Promise<Result[]> {
  const results: Result[] = [];

  for (const field of fields) {
    // Skip formula fields (they can't be required)
    if (field.type === "formula") {
      continue;
    }

    if (field.required) {
      const value = data[field.name];
      const hasValue =
        value !== undefined &&
        value !== null &&
        value !== "" &&
        (!Array.isArray(value) || (value as any[]).length);

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
 * Validates picklist fields for a record
 *
 * @param fields The table field definitions
 * @param data Record to verify
 * @returns List of results for valid or invalid fields in the record data for picklist fields
 */
export async function validatePicklistFields(
  fields: Field[],
  data: Record<string, any>
): Promise<Result[]> {
  const results: Result[] = [];

  for (const field of fields) {
    if (field.type === "picklist") {
      const value = data[field.name];

      if (value !== undefined && value !== null && value !== "") {
        if (!(value in field.options!)) {
          results.push({
            field: field.name,
            valid: false,
            error: `Field ${field.name} must match available options`,
          });
          continue;
        }
      }

      results.push({ field: field.name, valid: true });
    }
  }

  return results;
}

/**
 * Validates multipicklist fields for tables
 *
 * @param fields The table field definitions
 * @param data Record data to validate
 * @returns List of validation results for multipicklist fields in record data
 */
export async function validateMultipicklistFields(
  fields: Field[],
  data: Record<string, any>
): Promise<Result[]> {
  const results: Result[] = [];

  for (const field of fields) {
    if (field.type === "multipicklist") {
      const value = data[field.name];

      if (value !== undefined && value !== null) {
        if (!Array.isArray(value)) {
          results.push({
            field: field.name,
            valid: false,
            error: `Field ${field.name} value must be an array`,
          });
          continue;
        } else if ((value as any[]).some((v) => !(v in field.options!))) {
          results.push({
            field: field.name,
            valid: false,
            error: `Field ${field.name} values must match available options`,
          });
          continue;
        }
      }

      results.push({ field: field.name, valid: true });
    }
  }

  return results;
}
