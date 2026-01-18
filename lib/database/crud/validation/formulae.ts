import Field from "@/lib/database/types/field";
import Context from "@/lib/database/crud/validation/types/formula-context";
import path from "path";
import fs from "fs";
import vm from "vm";

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
  field: Field,
  record: Record<string, any>
): Promise<any> {
  try {
    // Get system storage path (lazy import to avoid circular dependency)
    const { default: SettingManager } = await import("@/lib/database/managers/setting");
    const storagePath = (await new SettingManager().readRecord("storage"))?.data
      .value;

    if (!storagePath) {
      throw new Error("System storage not configured");
    }

    // Build the formula script path from system storage
    const formulaPath = path.join(
      storagePath,
      "apps",
      appId,
      "tables",
      tableName,
      field.name,
      "formula.js"
    );

    // Check if formula exists
    if (!fs.existsSync(formulaPath)) {
      throw new Error(`Formula script not found for field ${field.name}`);
    }

    // Read and execute the formula script using vm
    const scriptCode = fs.readFileSync(formulaPath, "utf8");

    // Create a sandbox context with the formula context
    const context: Context = {
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
    const formulaFn =
      sandbox.module.exports.default ||
      sandbox.module.exports ||
      sandbox.exports;

    if (typeof formulaFn !== "function") {
      throw new Error("Formula must export a function");
    }

    const result = await formulaFn(context);
    return result;
  } catch (error) {
    throw new Error(
      `Formula execution failed for field ${field.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Calculate all formula fields in a record
 * @param appId The app ID
 * @param tableName The table name
 * @param fields The table field definitions
 * @param data The record data
 * @returns Updated record data with calculated formula values
 */
export async function calculateFormulas(
  appId: string,
  tableName: string,
  fields: Field[],
  data: Record<string, any>
): Promise<Record<string, any>> {
  const updatedData = { ...data };

  for (const field of fields) {
    if (field.type === "formula") {
      const value = await executeFormula(appId, tableName, field, updatedData);
      updatedData[field.name] = value;
    }
  }

  return updatedData;
}
