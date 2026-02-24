import { FieldFilter } from "@/lib/database/crud/types/record-filter";
import ConditionBuilder from "@/lib/database/crud/processor/types/condition-builder";

export default class ConditionSqlBuilder {
  private pos = 0;
  paramIdx: number;

  constructor(
    private readonly tokens: string[],
    private readonly filters: FieldFilter[],
    private readonly buildOne: ConditionBuilder,
    private readonly params: any[],
    startIdx: number,
  ) {
    this.paramIdx = startIdx;
  }

  build(): string {
    return this.parseExpr();
  }

  private parseExpr(): string {
    let left = this.parseTerm();
    while (
      this.pos < this.tokens.length &&
      (this.tokens[this.pos] === "AND" || this.tokens[this.pos] === "OR")
    ) {
      const op = this.tokens[this.pos++];
      left = `${left} ${op} ${this.parseTerm()}`;
    }
    return left;
  }

  private parseTerm(): string {
    const tok = this.tokens[this.pos];
    if (tok === "(") {
      this.pos++;
      const inner = this.parseExpr();
      this.pos++; // consume ')'
      return `(${inner})`;
    }
    // Number token (1-indexed)
    this.pos++;
    const [sql, next] = this.buildOne(
      this.filters[parseInt(tok, 10) - 1],
      this.params,
      this.paramIdx,
    );
    this.paramIdx = next;
    return sql;
  }
}
