/**
 * Table definition loading and management utilities
 */

import TableDefinition from '@/lib/database/types/tableDefinition';
import { getAllApps, getApp } from '@/lib/db';
import { readRecords } from '@/lib/model/records';

/**
 * Load table definitions from table records in the database
 */
export async function loadAppTables(appId: string): Promise<TableDefinition[]> {
  const app = await getApp(appId);

  if (!app) {
    throw new Error(`App ${appId} not found`);
  }

  // Load tables from table records instead of app record
  const { records } = await readRecords('system', 'table', {
    fields: { app: appId },
  });

  return records.map((record) => ({
    name: record.data.tableName,
    description: record.data.description,
    fields: record.data.fields,
  }));
}

/**
 * Load a specific table definition from an app
 */
export async function loadTable(
  appId: string,
  tableName: string
): Promise<TableDefinition | null> {
  const tables = await loadAppTables(appId);
  return tables.find((t) => t.name === tableName) || null;
}

/**
 * Get all table definitions across all installed apps
 */
export async function getAllTables(): Promise<
  Map<string, { appId: string; table: TableDefinition }>
> {
  const tableMap = new Map<
    string,
    { appId: string; table: TableDefinition }
  >();

  // Load all table records from the database
  const { records } = await readRecords('system', 'table', {});

  for (const record of records) {
    const appId = record.data.app;
    const table: TableDefinition = {
      name: record.data.tableName,
      description: record.data.description,
      fields: record.data.fields,
    };
    const key = `${appId}:${table.name}`;
    tableMap.set(key, { appId, table });
  }

  return tableMap;
}

/**
 * Validate that a table definition is well-formed
 */
export function validateTableDefinition(table: TableDefinition): string[] {
  const errors: string[] = [];

  if (!table.name) {
    errors.push('Table must have a name');
  }

  if (!table.description) {
    errors.push('Table must have a description');
  }

  if (!table.fields || !Array.isArray(table.fields)) {
    errors.push('Table must have a fields array');
    return errors;
  }

  if (table.fields.length === 0) {
    errors.push('Table must have at least one field');
  }

  const fieldNames = new Set<string>();

  for (let i = 0; i < table.fields.length; i++) {
    const field = table.fields[i];
    const fieldPrefix = `Field ${i + 1}`;

    if (!field.name) {
      errors.push(`${fieldPrefix}: Field must have a name`);
    } else {
      if (fieldNames.has(field.name)) {
        errors.push(`${fieldPrefix}: Duplicate field name "${field.name}"`);
      }
      fieldNames.add(field.name);
    }

    if (!field.description) {
      errors.push(`${fieldPrefix} (${field.name}): Field must have a description`);
    }

    if (!field.type) {
      errors.push(`${fieldPrefix} (${field.name}): Field must have a type`);
    }

    const validTypes = [
      'string',
      'number',
      'boolean',
      'date',
      'datetime',
      'json',
      'relationship',
      'formula',
    ];

    if (field.type && !validTypes.includes(field.type)) {
      errors.push(
        `${fieldPrefix} (${field.name}): Invalid field type "${field.type}"`
      );
    }

    if (field.type === 'relationship' && !field.relatedTo) {
      errors.push(
        `${fieldPrefix} (${field.name}): Relationship field must have relatedTo property`
      );
    }

    if (field.type === 'relationship' && field.relatedTo) {
      const parts = field.relatedTo.split(':');
      if (parts.length !== 2) {
        errors.push(
          `${fieldPrefix} (${field.name}): relatedTo must be in format "app-id:table-id"`
        );
      }
    }

    if (field.type === 'formula' && field.required) {
      errors.push(
        `${fieldPrefix} (${field.name}): Formula fields cannot be required`
      );
    }
  }

  return errors;
}

/**
 * Search tables across all apps
 */
export async function searchTables(
  query: string = ''
): Promise<Array<{ appId: string; appName: string; table: TableDefinition }>> {
  const allTables = await getAllTables();
  const results: Array<{
    appId: string;
    appName: string;
    table: TableDefinition;
  }> = [];

  const apps = await getAllApps();
  const appNamesMap = new Map<string, string>();
  for (const app of apps) {
    appNamesMap.set(app.id, app.label);
  }

  const lowerQuery = query.toLowerCase();

  for (const [key, { appId, table }] of allTables) {
    const tableName = table.name.toLowerCase();
    const tableDesc = table.description.toLowerCase();
    const appName = appNamesMap.get(appId) || appId;

    // If no query, return all tables
    if (!query ||
      tableName.includes(lowerQuery) ||
      tableDesc.includes(lowerQuery) ||
      appName.toLowerCase().includes(lowerQuery)
    ) {
      results.push({ appId, appName, table });
    }
  }

  return results;
}

/**
 * Get tables for a specific app with app metadata
 */
export async function getTablesForApp(
  appId: string
): Promise<Array<{ appId: string; appName: string; table: TableDefinition }>> {
  const tables = await loadAppTables(appId);
  const app = await getApp(appId);
  const appName = app ? app.label : appId;

  return tables.map((table) => ({
    appId,
    appName,
    table,
  }));
}
