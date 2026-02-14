import { PoolClient } from "pg";
import { readRecord, readRecords } from "@/lib/database/crud/read";
import { validateAndProcessRecord } from "@/lib/database/validation";
import Field from "@/lib/database/types/field";
import DependentRecord from "@/lib/database/validation/types/dependent-record";
import { sqlUpdate } from "@/lib/database/crud/update";
import { sqlDelete } from "@/lib/database/crud/delete";

const MAX_CASCADE_DEPTH = 10;

/**
 * Cascade reprocessing for records related via relationship fields.
 * Writes directly within the transaction — no more PendingOperation accumulator.
 *
 * Performs both:
 * - Forward pass: follows the changed record's relationship fields to reprocess targets
 * - Reverse pass: finds records in other tables that point to this record and reprocesses them
 *
 * @param appId App owning the changed record's table
 * @param tableName Table of the changed record
 * @param recordId ID of the changed record (used for reverse lookups)
 * @param recordData The changed record's data (used to find forward relationship targets)
 * @param client PoolClient for within-transaction reads and writes
 * @param visited Set of already-processed record keys to prevent loops
 * @param depth Current recursion depth
 */
export async function cascadeCollect(
  appId: string,
  tableName: string,
  recordId: string,
  recordData: Record<string, any>,
  client: PoolClient,
  visited: Set<string> = new Set(),
  depth: number = 0,
): Promise<void> {
  if (depth >= MAX_CASCADE_DEPTH) return;

  const { default: FieldManager } = await import("@/lib/managers/field");
  const fieldManager = new FieldManager();
  const fields = await fieldManager.loadTableFields(appId, tableName);

  // Forward pass: follow this record's relationship fields to reprocess target records
  for (const field of fields) {
    if (field.type !== "relationship" || !field.related_to) continue;

    const value = recordData[field.name];
    if (!value) continue;

    // Parse target app and table
    let targetAppId = appId;
    let targetTableName = field.related_to;
    if (field.related_to.includes(":")) {
      [targetAppId, targetTableName] = field.related_to.split(":");
    }

    // Relationship value can be single ID or array
    const relatedIds: string[] = Array.isArray(value) ? value : [value];

    for (const relatedId of relatedIds) {
      await reprocessRecord(
        targetAppId,
        targetTableName,
        relatedId,
        client,
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
      if (field.type !== "relationship" || !field.related_to) continue;

      let resolvedRef = field.related_to;
      if (!resolvedRef.includes(":")) {
        resolvedRef = `${field.app}:${resolvedRef}`;
      }

      if (resolvedRef !== targetRef) continue;

      // Query for records that reference our record (within the transaction)
      const tableFields = await fieldManager.loadTableFields(
        field.app,
        field.table_name,
      );
      const result = await readRecords(
        field.app,
        field.table_name,
        tableFields,
        {
          fields: { [field.name]: recordId },
        },
        client,
      );

      for (const record of result.records) {
        await reprocessRecord(
          field.app,
          field.table_name,
          record.id,
          client,
          visited,
          depth,
        );
      }
    }
  }
}

/**
 * Reprocess a single target record. Writes directly to DB within the transaction
 * if data changed. Recurses via cascadeCollect for the reprocessed record's own relationships.
 */
async function reprocessRecord(
  targetAppId: string,
  targetTableName: string,
  targetRecordId: string,
  client: PoolClient,
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
    client,
  );
  if (!targetRecord) return;

  const { default: TableManager } = await import("@/lib/managers/table");
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
    client,
  );

  const dataChanged =
    JSON.stringify(targetRecord.data) !== JSON.stringify(reprocessedData);

  if (dataChanged) {
    const now = Date.now();

    // Write directly within the transaction — next cascade level sees updated data
    await sqlUpdate(
      client,
      targetAppId,
      targetTableName,
      targetRecordId,
      reprocessedData,
      now,
    );

    await cascadeCollect(
      targetAppId,
      targetTableName,
      targetRecordId,
      reprocessedData,
      client,
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
 * @param client PoolClient for within-transaction reads
 * @returns Array of dependent records
 */
export async function checkDependents(
  appId: string,
  tableName: string,
  recordId: string,
  client: PoolClient,
): Promise<DependentRecord[]> {
  const { default: FieldManager } = await import("@/lib/managers/field");
  const fieldManager = new FieldManager();

  // Load all field definitions in the system
  const allFieldsResult = await fieldManager.readRecords({});
  const allFields: Field[] = allFieldsResult.records.map((r) => r.data);

  const targetRef = `${appId}:${tableName}`;
  const dependents: DependentRecord[] = [];

  // Find required relationship fields pointing to our table
  for (const field of allFields) {
    if (field.type !== "relationship" || !field.required || !field.related_to)
      continue;

    // Resolve the related_to to full format
    let resolvedRef = field.related_to;
    if (!resolvedRef.includes(":")) {
      resolvedRef = `${field.app}:${resolvedRef}`;
    }

    if (resolvedRef !== targetRef) continue;

    // Query for records in this field's table where the field value matches our record ID
    const tableFields = await fieldManager.loadTableFields(
      field.app,
      field.table_name,
    );
    const result = await readRecords(
      field.app,
      field.table_name,
      tableFields,
      {
        fields: { [field.name]: recordId },
      },
      client,
    );

    for (const record of result.records) {
      dependents.push({
        appId: field.app,
        tableName: field.table_name,
        fieldName: field.name,
        recordId: record.id,
        recordData: record.data as Record<string, any>,
      });
    }
  }

  return dependents;
}

/**
 * Recursively delete dependent records and reprocess formulas for cascade deletion.
 * Writes directly within the transaction.
 *
 * @param appId App owning the record being deleted
 * @param tableName Table of the record being deleted
 * @param recordId ID of the record being deleted
 * @param recordData Data of the record being deleted (for relationship traversal)
 * @param client PoolClient for within-transaction reads and writes
 * @param visited Set of already-processed record keys
 * @param depth Current recursion depth
 */
export async function cascadeCollectDeletes(
  appId: string,
  tableName: string,
  recordId: string,
  recordData: Record<string, any>,
  client: PoolClient,
  visited: Set<string> = new Set(),
  depth: number = 0,
): Promise<void> {
  if (depth >= MAX_CASCADE_DEPTH) return;

  // Find records that depend on this record via required relationships
  const dependents = await checkDependents(appId, tableName, recordId, client);

  for (const dep of dependents) {
    const visitKey = `${dep.appId}:${dep.tableName}:${dep.recordId}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    // Recurse first: this dependent's own dependents also need cascade deletion
    await cascadeCollectDeletes(
      dep.appId,
      dep.tableName,
      dep.recordId,
      dep.recordData,
      client,
      visited,
      depth + 1,
    );

    // Delete the dependent record within the transaction
    await sqlDelete(client, dep.appId, dep.tableName, dep.recordId);
  }

  // Also cascade formula reprocessing for the deleted record's forward relationships
  // (records the deleted record was pointing to may have formulas that counted it)
  await cascadeCollect(
    appId,
    tableName,
    recordId,
    recordData,
    client,
    visited,
    depth,
  );
}
