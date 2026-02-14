import Field from "@/lib/database/schema/field";
import { quoteIfReserved } from "@/lib/database/utility/postgresql";

export default class Table {
  public createNonexisting: boolean;
  public name: string;
  public fields: Field[];
  public primaryKey: string[] | undefined;

  public constructor({
    createNonexisting,
    name,
    fields,
    primaryKey,
  }: {
    createNonexisting?: boolean;
    name: string;
    fields?: Field[];
    primaryKey?: string[];
  }) {
    this.createNonexisting = createNonexisting ?? false;
    this.name = name;
    this.fields = fields ?? [];
    this.primaryKey = primaryKey;
  }

  public toSql(opts?: { deferForeignKeys?: Set<string> }): string {
    if (!this.primaryKey && !this.fields.some((f) => f.primaryKey)) {
      throw new Error(`Primary key must be specified for table "${this.name}"`);
    }

    if (this.primaryKey && this.fields.some((f) => f.primaryKey)) {
      throw new Error(
        `Primary key must be either at the table or the field level, not both, for table "${this.name}"`,
      );
    }

    if (this.primaryKey) {
      const missingFields = this.primaryKey.filter(
        (pkf) => !this.fields.some((f) => f.name == pkf),
      );

      if (missingFields.length) {
        throw new Error(
          `Missing primary key fields for table "${this.name}": ${missingFields.map((f) => '"' + f + '"').join(", ")}`,
        );
      }
    }

    const deferSet = opts?.deferForeignKeys ?? new Set<string>();
    const nonexistingClause = this.createNonexisting ? "IF NOT EXISTS" : "";
    const tableName = quoteIfReserved(this.name);
    const primaryKeyClause = this.primaryKey
      ? `PRIMARY KEY (${this.primaryKey.map(quoteIfReserved).join(", ")})`
      : "";
    const fieldsClauseTerminator = primaryKeyClause ? ",\n" : "";
    const fieldsClause = this.fields
      .map((f) => f.toSql({ skipForeignKey: deferSet.has(f.name) }))
      .join(",\n");

    return `CREATE TABLE ${nonexistingClause} ${tableName} (\n${fieldsClause}${fieldsClauseTerminator}${primaryKeyClause}\n);`;
  }

  public getDeferredFkSql(deferredFields: Set<string>): string[] {
    return this.fields
      .filter((f) => f.foreignKey && deferredFields.has(f.name))
      .map((f) => f.toAlterFkSql(this.name));
  }
}
