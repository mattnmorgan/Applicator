import type FieldType from "@/lib/database/schema/types/field-type";
import { quoteIfReserved } from "@/lib/database/schema/reserved";

export default class Field {
  public name: string;
  public primaryKey: boolean;
  public type: FieldType;
  public defaultValue: any | undefined;
  public nillable: boolean;
  public unique: boolean;
  public check: string[] | undefined;
  public foreignKey:
    | {
        table: string;
        field: string;
        cascade: boolean;
      }
    | undefined;

  public constructor({
    name,
    type,
    defaultValue,
    nillable,
    foreignKey,
    unique,
    primaryKey,
    check,
  }: {
    primaryKey?: boolean;
    name: string;
    type: FieldType;
    defaultValue?: any;
    nillable?: boolean;
    unique?: boolean;
    foreignKey?: { table: string; field: string; cascade?: boolean };
    check?: string[];
  }) {
    this.name = name;
    this.type = type;
    this.defaultValue = defaultValue;
    this.nillable = nillable ?? false;
    this.foreignKey = foreignKey
      ? { ...foreignKey, cascade: foreignKey.cascade ?? false }
      : undefined;
    this.unique = unique ?? false;
    this.primaryKey = primaryKey ?? false;
    this.check = check;
  }

  public toSql(opts?: { skipForeignKey?: boolean }): string {
    const columnName = quoteIfReserved(this.name);
    const skipFk = opts?.skipForeignKey ?? false;
    const defaultValue =
      typeof this.defaultValue === "string"
        ? `'${this.defaultValue}'`
        : this.defaultValue;

    const parts = [
      columnName,
      this.type.toUpperCase(),
      this.primaryKey ? "PRIMARY KEY" : "",
      this.unique ? "UNIQUE" : "",
      !this.nillable && !this.primaryKey ? "NOT NULL" : "",
      this.defaultValue !== undefined && this.defaultValue !== null
        ? `DEFAULT ${defaultValue}`
        : "",
      this.check
        ? `CHECK (${columnName} IN (${this.check.map((v) => `'${v}'`).join(", ")}))`
        : "",
      !skipFk && this.foreignKey
        ? `REFERENCES ${quoteIfReserved(this.foreignKey.table)}(${quoteIfReserved(this.foreignKey.field)})`
        : "",
      !skipFk && this.foreignKey?.cascade ? "ON DELETE CASCADE" : "",
    ];

    return parts.filter(Boolean).join(" ");
  }

  public toAlterFkSql(tableName: string): string {
    if (!this.foreignKey) return "";

    const table = quoteIfReserved(tableName);
    const column = quoteIfReserved(this.name);
    const refTable = quoteIfReserved(this.foreignKey.table);
    const refField = quoteIfReserved(this.foreignKey.field);
    const cascade = this.foreignKey.cascade ? " ON DELETE CASCADE" : "";

    return `ALTER TABLE ${table} ADD FOREIGN KEY (${column}) REFERENCES ${refTable}(${refField})${cascade};`;
  }
}
