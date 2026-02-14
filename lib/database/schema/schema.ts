import Table from "@/lib/database/schema/table";
import Index from "@/lib/database/schema/index";

export default class Schema {
  public tables: Table[];
  public indices: Index[];

  public constructor({
    tables,
    indices,
  }: {
    tables?: Table[];
    indices?: Index[];
  }) {
    this.tables = tables ?? [];
    this.indices = indices ?? [];
  }

  public toSql(): string {
    if (!this.tables.length) {
      throw new Error("You must have at least one table in the schema");
    }

    const createdTables = new Set<string>();
    const createStatements: string[] = [];
    const alterStatements: string[] = [];

    for (const table of this.tables) {
      // Find fields with FKs to tables not yet created (excluding self-references)
      const deferredFields = new Set<string>();
      for (const field of table.fields) {
        if (
          field.foreignKey &&
          field.foreignKey.table !== table.name &&
          !createdTables.has(field.foreignKey.table)
        ) {
          deferredFields.add(field.name);
        }
      }

      createStatements.push(
        table.toSql(
          deferredFields.size > 0 ? { deferForeignKeys: deferredFields } : undefined,
        ),
      );

      if (deferredFields.size > 0) {
        alterStatements.push(...table.getDeferredFkSql(deferredFields));
      }

      createdTables.add(table.name);
    }

    const parts = [
      createStatements.join("\n\n"),
      alterStatements.length ? alterStatements.join("\n") : "",
      this.indices.map((i) => i.toSql()).join("\n"),
    ].filter(Boolean);

    return parts.join("\n\n");
  }
}
