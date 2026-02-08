import Table from "@/lib/database/types/table";
import {
  validateRequiredFields,
  validateFields,
  validatePicklistFields,
  validateMultipicklistFields,
} from "@/lib/database/crud/validation/validator";
import { calculateFormulas } from "@/lib/database/crud/validation/formulae";
import { hashPasswordFields } from "@/lib/database/crud/validation/password";

/**
 * Validate and process a record according to the execution order
 *
 * @param appId The app ID
 * @param tableName The table name
 * @param table The table definition (null during bootstrap - will be ignored)
 * @param data The record data
 * @param skipValidation Whether to skip validation
 * @param recordId Id of the record being validated/processed
 * @returns Processed record data
 * @throws Error if validation fails
 */
export async function validateAndProcessRecord(
  appId: string,
  tableName: string,
  table: Table | null,
  data: Record<string, any>,
  skipValidation: boolean = false,
  recordId: string = "",
): Promise<Record<string, any>> {
  let processedData = { ...data };

  // If table is null (bootstrap scenario) or skipValidation, skip all validation and processing
  if (!table || skipValidation) {
    return processedData;
  }

  // Fetch fields once for all validation functions
  const FieldManager = (await import("@/lib/database/managers/field")).default;
  const fieldManager = new FieldManager();
  const fields = await fieldManager.loadTableFields(appId, tableName);

  // Hash password fields (before validation)
  processedData = await hashPasswordFields(fields, processedData);

  // Validate required fields
  const requiredResults = await validateRequiredFields(fields, processedData);
  const requiredFailures = requiredResults.filter((r) => !r.valid);

  if (requiredFailures.length > 0) {
    const errors = requiredFailures.map((r) => r.error).join(", ");
    throw new Error(`Required field validation failed: ${errors}`);
  }

  // Validate picklist fields
  const picklistResults = await validatePicklistFields(fields, processedData);
  const picklistFailures = picklistResults.filter((r) => !r.valid);

  if (picklistFailures.length) {
    const errors = picklistFailures.map((r) => r.error).join(", ");
    throw new Error(`Picklist field validation failed: ${errors}`);
  }

  // Validate multipicklist fields
  const multipicklistResults = await validateMultipicklistFields(
    fields,
    processedData,
  );
  const multipicklistFailures = multipicklistResults.filter((r) => !r.valid);

  if (multipicklistFailures.length) {
    const errors = multipicklistFailures.map((r) => r.error).join(", ");
    throw new Error(`Multipicklist field validation failed: ${errors}`);
  }

  // Calculate formula fields
  processedData = await calculateFormulas(
    appId,
    tableName,
    fields,
    processedData,
    recordId,
  );

  // Execute validator scripts
  const validationResults = await validateFields(
    appId,
    tableName,
    fields,
    processedData,
  );
  const validationFailures = validationResults.filter((r) => !r.valid);

  if (validationFailures.length > 0) {
    const errors = validationFailures.map((r) => r.error).join(", ");
    throw new Error(`Field validation failed: ${errors}`);
  }

  return processedData;
}
