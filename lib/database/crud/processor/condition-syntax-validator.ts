export default class ConditionSyntaxValidator {
  private pos = 0;
  constructor(private readonly tokens: string[]) {}

  validate(): void {
    if (this.tokens.length === 0) throw new Error("Condition string is empty");
    this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new Error(
        `Unexpected token "${this.tokens[this.pos]}" in condition`,
      );
    }
  }

  private parseExpr(): void {
    this.parseTerm();
    while (
      this.pos < this.tokens.length &&
      (this.tokens[this.pos] === "AND" || this.tokens[this.pos] === "OR")
    ) {
      this.pos++;
      this.parseTerm();
    }
  }

  private parseTerm(): void {
    if (this.pos >= this.tokens.length) {
      throw new Error("Unexpected end of condition string");
    }
    const tok = this.tokens[this.pos];
    if (tok === "(") {
      this.pos++;
      this.parseExpr();
      if (this.pos >= this.tokens.length || this.tokens[this.pos] !== ")") {
        throw new Error('Missing closing ")" in condition string');
      }
      this.pos++;
    } else if (/^\d+$/.test(tok)) {
      this.pos++;
    } else {
      throw new Error(`Unexpected token "${tok}" in condition string`);
    }
  }
}
