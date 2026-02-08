import { readRecord, readRecords } from "@/lib/database/crud/read";
import { getRecordKey } from "@/lib/database/crud/redis";
import { validateAndProcessRecord } from "@/lib/database/crud/validation";
import TableRecord from "@/lib/database/crud/types/record";
import Field from "@/lib/database/types/field";
import PendingOperation from "@/lib/database/crud/validation/types/pending-operation";
import DependentRecord from "@/lib/database/crud/validation/types/dependent-record";

const MAX_CASCADE_DEPTH = 10;

/**
 * Collect cascade reprocessing operations for records related via relationship fields.
 * Does NOT save anything — returns pending SET operations for the caller to commit atomically.
 *
 * Performs both:
 * - Forward pass: follows the changed record's relationship fields to reprocess targets
 * - Reverse pass: finds records in other tables that point to this record and reprocesses them
 *
 * @param appId App owning the changed record's table
 * @param tableName Table of the changed record
 * @param recordId ID of the changed record (used for reverse lookups)
 * @param recordData The changed record's data (used to find forward relationship targets)
 * @param operations Accumulator for pending operations
 * @param visited Set of already-processed record keys to prevent loops
 * @param depth Current recursion depth
 * @returns Array of pending SET operations
 */
export async function cascadeCollect(
  appId: string,
  tableName: string,
  recordId: string,
  recordData: Record<string, any>,
  operations: PendingOperation[] = [],
  visited: Set<string> = new Set(),
  depth: number = 0,
): Promise<PendingOperation[]> {
  if (depth >= MAX_CASCADE_DEPTH) return operations;

  const { default: FieldManager } =
    await import("@/lib/database/managers/field");
  const fieldManager = new FieldManager();
  const fields = await fieldManager.loadTableFields(appId, tableName);

  // Forward pass: follow this record's relationship fields to reprocess target records
  for (const field of fields) {
    if (field.type !== "relationship" || !field.relatedTo) continue;

    const value = recordData[field.name];
    if (!value) continue;

    // Parse target app and table
    let targetAppId = appId;
    let targetTableName = field.relatedTo;
    if (field.relatedTo.includes(":")) {
      [targetAppId, targetTableName] = field.relatedTo.split(":");
    }

    // Relationship value can be single ID or array
    const relatedIds: string[] = Array.isArray(value) ? value : [value];

    for (const relatedId of relatedIds) {
      await reprocessRecord(
        targetAppId,
        targetTableName,
        relatedId,
        operations,
        visited,
        depth,
      );
    }
  }

  // Reverse pass: find records in other tables that point to this record
  if (recordId) {
    const allFieldsResult = await fieldManager.readRecords({});
    const allFields: Field[] = allFieldsResult.records.map((r) => r.data);

    const targetRef = `${appId}:${tableName}`;

    for (const field of allFields) {
      if (field.type !== "relationship" || !field.relatedTo) continue;

      let resolvedRef = field.relatedTo;
      if (!resolvedRef.includes(":")) {
        resolvedRef = `${field.app}:${resolvedRef}`;
      }

      if (resolvedRef !== targetRef) continue;

      // Query for records that reference our record
      const tableFields = await fieldManager.loadTableFields(
        field.app,
        field.table,
      );
      const result = await readRecords(field.app, field.table, tableFields, {
        fields: { [field.name]: recordId },
      });

      for (const record of result.records) {
        await reprocessRecord(
          field.app,
          field.table,
          record.id,
          operations,
          visited,
          depth,
        );
      }
    }
  }

  return operations;
}

/**
 * Reprocess a single target record and add SET operation if data changed.
 * Recurses via cascadeCollect for the reprocessed record's own relationships.
 */
async function reprocessRecord(
  targetAppId: string,
  targetTableName: string,
  targetRecordId: string,
  operations: PendingOperation[],
  visited: Set<string>,
  depth: number,
): Promise<void> {
  const visitKey = `${targetAppId}:${targetTableName}:${targetRecordId}`;
  if (visited.has(visitKey)) return;
  visited.add(visitKey);

  const targetRecord = await readRecord(
    targetAppId,
    targetTableName,
    targetRecordId,
  );
  if (!targetRecord) return;

  const { default: TableManager } =
    await import("@/lib/database/managers/table");
  const tableManager = new TableManager();
  const targetTable = await tableManager.loadTable(
    targetAppId,
    targetTableName,
  );
  if (!targetTable) return;

  const reprocessedData = await validateAndProcessRecord(
    targetAppId,
    targetTableName,
    targetTable,
    targetRecord.data as Record<string, any>,
    false,
    targetRecordId,
  );

  const dataChanged =
    JSON.stringify(targetRecord.data) !== JSON.stringify(reprocessedData);

  if (dataChanged) {
    const updatedRecord: TableRecord = {
      ...targetRecord,
      data: reprocessedData,
      updatedAt: Date.now(),
    };
    const key = getRecordKey(targetAppId, targetTableName, targetRecordId);
    operations.push({ type: "set", key, value: JSON.stringify(updatedRecord) });

    await cascadeCollect(
      targetAppId,
      targetTableName,
      targetRecordId,
      reprocessedData,
      operations,
      visited,
      depth + 1,
    );
  }
}

/**
 * Find records that depend on a given record via required relationship fields.
 * Searches ALL field definitions across all apps for required relationships pointing
 * to the specified table.
 *
 * @param appId App owning the target record
 * @param tableName Table of the target record
 * @param recordId ID of the target record
 * @returns Array of dependent records
 */
export async function checkDependents(
  appId: string,
  tableName: string,
  recordId: string,
): Promise<DependentRecord[]> {
  const { default: FieldManager } =
    await import("@/lib/database/managers/field");
  const fieldManager = new FieldManager();

  // Load all field definitions in the system
  const allFieldsResult = await fieldManager.readRecords({});
  const allFields: Field[] = allFieldsResult.records.map((r) => r.data);

  const targetRef = `${appId}:${tableName}`;
  const dependents: DependentRecord[] = [];

  // Find required relationship fields pointing to our table
  for (const field of allFields) {
    if (field.type !== "relationship" || !field.required || !field.relatedTo)
      continue;

    // Resolve the relatedTo to full format
    let resolvedRef = field.relatedTo;
    if (!resolvedRef.includes(":")) {
      resolvedRef = `${field.app}:${resolvedRef}`;
    }

    if (resolvedRef !== targetRef) continue;

    // Query for records in this field's table where the field value matches our record ID
    const tableFields = await fieldManager.loadTableFields(
      field.app,
      field.table,
    );
    const result = await readRecords(field.app, field.table, tableFields, {
      fields: { [field.name]: recordId },
    });

    for (const record of result.records) {
      dependents.push({
        appId: field.app,
        tableName: field.table,
        fieldName: field.name,
        recordId: record.id,
        recordData: record.data as Record<string, any>,
      });
    }
  }

  return dependents;
}

/**
 * Recursively collect DEL operations for cascade deletion, plus reprocessing
 * operations for related records whose formulas may change.
 *
 * @param appId App owning the record being deleted
 * @param tableName Table of the record being deleted
 * @param recordId ID of the record being deleted
 * @param recordData Data of the record being deleted (for relationship traversal)
 * @param operations Accumulator for pending operations
 * @param visited Set of already-processed record keys
 * @param depth Current recursion depth
 * @returns Array of pending DEL and SET operations
 */

export async function cascadeCollectDeletes(
  appId: string,
  tableName: string,
  recordId: string,
  recordData: Record<string, any>,
  operations: PendingOperation[] = [],
  visited: Set<string> = new Set(),
  depth: number = 0,
): Promise<PendingOperation[]> {
  if (depth >= MAX_CASCADE_DEPTH) return operations;

  // Find records that depend on this record via required relationships
  const dependents = await checkDependents(appId, tableName, recordId);

  for (const dep of dependents) {
    const visitKey = `${dep.appId}:${dep.tableName}:${dep.recordId}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    // Add DEL operation for the dependent record
    const key = getRecordKey(dep.appId, dep.tableName, dep.recordId);
    operations.push({ type: "del", key });

    // Recurse: this dependent's own dependents also need cascade deletion
    await cascadeCollectDeletes(
      dep.appId,
      dep.tableName,
      dep.recordId,
      dep.recordData,
      operations,
      visited,
      depth + 1,
    );
  }

  // Also collect formula reprocessing for the deleted record's forward relationships
  // (records the deleted record was pointing to may have formulas that counted it)
  await cascadeCollect(
    appId,
    tableName,
    recordId,
    recordData,
    operations,
    visited,
    depth,
  );

  return operations;
}
