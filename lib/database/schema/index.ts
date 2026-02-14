import { quoteIfReserved } from "@/lib/database/schema/reserved";

export default class Index {
  public createNonexisting: boolean;
  public name: string;
  public table: string;
  public fields: string[];
  public using: "gin" | undefined;

  public constructor({
    createNonexisting,
    name,
    table,
    fields,
    using,
  }: {
    createNonexisting?: boolean;
    name: string;
    table: string;
    fields: string[];
    using?: "gin";
  }) {
    this.createNonexisting = createNonexisting ?? false;
    this.name = name;
    this.table = table;
    this.fields = fields;
    this.using = using;
  }

  public toSql(): string {
    const ifNonexistClause = this.createNonexisting ? "IF NOT EXISTS" : "";
    const tableName = quoteIfReserved(this.table);
    const usingClause = this.using ? ` USING ${this.using}` : "";
    const fieldsClause = `(${this.fields.map(quoteIfReserved).join(", ")})`;

    return `CREATE INDEX ${ifNonexistClause} ${this.name} ON ${tableName}${usingClause}${fieldsClause};`;
  }
}
