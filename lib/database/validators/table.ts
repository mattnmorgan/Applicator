import Table from "@/lib/database/types/table";
import TableManager from "@/lib/database/managers/table";
import TableRecord from "@/lib/database/crud/types/record";
import Validator from "@/lib/database/crud/types/validator";

export default class TableValidator extends Validator<Table> {
  public async validate(table: Table) {
    const errors: string[] = [];
    const existingTables: TableRecord<Table>[] = (
      await new TableManager().readRecords()
    ).records;

    if (!table.tableName) {
      errors.push("Table must have a tableName");
    }

    if (!table.app) {
      errors.push("Table must have an app");
    }

    if (!table.description) {
      errors.push("Table must have a description");
    }

    if (!table.fields || !Array.isArray(table.fields)) {
      errors.push("Table must have a fields array");
      return errors;
    }

    if (table.fields.length === 0) {
      errors.push("Table must have at least one field");
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
        errors.push(
          `${fieldPrefix} (${field.name}): Field must have a description`
        );
      }

      if (!field.type) {
        errors.push(`${fieldPrefix} (${field.name}): Field must have a type`);
      }

      const validTypes = [
        "string",
        "number",
        "boolean",
        "date",
        "datetime",
        "json",
        "relationship",
        "formula",
      ];

      if (field.type && !validTypes.includes(field.type)) {
        errors.push(
          `${fieldPrefix} (${field.name}): Invalid field type "${field.type}"`
        );
      }

      if (field.type === "relationship" && !field.relatedTo) {
        errors.push(
          `${fieldPrefix} (${field.name}): Relationship field must have relatedTo property`
        );
      }

      if (field.type === "relationship" && field.relatedTo) {
        const parts = field.relatedTo.split(":");
        if (parts.length !== 2) {
          errors.push(
            `${fieldPrefix} (${field.name}): relatedTo must be in format "app-id:table-id"`
          );
        } else {
          if (
            !existingTables.some(
              (existingTable) => existingTable.id === field.relatedTo
            )
          ) {
            errors.push(`No such table ${field.relatedTo} exists`);
          }
        }
      }

      if (field.type === "formula" && field.required) {
        errors.push(
          `${fieldPrefix} (${field.name}): Formula fields cannot be required`
        );
      }
    }

    return errors;
  }
}
