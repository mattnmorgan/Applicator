import { PoolClient } from "pg";
import Field from "@/lib/database/types/field";
import Context from "@/lib/database/validation/types/formula-context";
import path from "path";
import fs from "fs";
import vm from "vm";

/**
 * Execute a formula script for a field
 * @param appId The app ID
 * @param tableName The table name
 * @param field The field definition
 * @param record The full record for formula calculation
 * @param recordId The record's ID
 * @param client Optional PoolClient so formula queries see uncommitted writes
 * @returns Calculated value
 */
export async function executeFormula(
  appId: string,
  tableName: string,
  field: Field,
  record: Record<string, any>,
  recordId: string = "",
  client?: PoolClient,
): Promise<any> {
  try {
    // Get system storage path (lazy import to avoid circular dependency)
    const { default: SettingManager } = await import("@/lib/managers/setting");
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
      "formula.js",
    );

    // Check if formula exists
    if (!fs.existsSync(formulaPath)) {
      throw new Error(`Formula script not found for field ${field.name}`);
    }

    // Read and execute the formula script using vm
    const scriptCode = fs.readFileSync(formulaPath, "utf8");

    // Build the query function for cross-table lookups
    // Pass the PoolClient so queries within formulas see uncommitted writes
    const { readRecords } = await import("@/lib/database/crud/read");
    const { default: FieldManager } = await import("@/lib/managers/field");
    const fieldManager = new FieldManager();

    const queryFn = async (
      queryAppId: string,
      queryTableName: string,
      filter: {
        fields?: Record<string, any>;
        limit?: number;
        offset?: number;
      } = {},
    ) => {
      const tableFields = await fieldManager.loadTableFields(
        queryAppId,
        queryTableName,
      );
      return readRecords(
        queryAppId,
        queryTableName,
        tableFields,
        filter,
        client,
      );
    };

    // Create a sandbox context with the formula context
    const context: Context = {
      id: recordId,
      record,
      field,
      query: queryFn,
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
      }`,
    );
  }
}

/**
 * Calculate all formula fields in a record
 * @param appId The app ID
 * @param tableName The table name
 * @param fields The table field definitions
 * @param data The record data
 * @param recordId The record's ID
 * @param client Optional PoolClient so formula queries see uncommitted writes
 * @returns Updated record data with calculated formula values
 */
export async function calculateFormulas(
  appId: string,
  tableName: string,
  fields: Field[],
  data: Record<string, any>,
  recordId: string = "",
  client?: PoolClient,
): Promise<Record<string, any>> {
  const updatedData = { ...data };

  for (const field of fields) {
    if (field.type === "formula") {
      const value = await executeFormula(
        appId,
        tableName,
        field,
        updatedData,
        recordId,
        client,
      );
      updatedData[field.name] = value;
    }
  }

  return updatedData;
}
