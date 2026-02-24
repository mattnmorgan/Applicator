import ConditionSyntaxValidator from "@/lib/database/crud/processor/condition-syntax-validator";

export function tokenizeCondition(condition: string): string[] {
  const tokens = condition.match(/\(|\)|AND|OR|\d+/gi) ?? [];
  return tokens.map((t) => {
    const u = t.toUpperCase();
    return u === "AND" || u === "OR" ? u : t;
  });
}

export function validateCondition(
  condition: string,
  filterCount: number,
): void {
  // No characters outside of digits, AND, OR, parens, whitespace
  const stray = condition.replace(/\(|\)|AND|OR|\d+|\s/gi, "").trim();
  if (stray.length > 0) {
    throw new Error(`Condition string contains invalid characters: "${stray}"`);
  }

  const tokens = tokenizeCondition(condition);

  // Bounds check: every index must be 1-based and within the filter array
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      const idx = parseInt(tok, 10);
      if (idx < 1 || idx > filterCount) {
        throw new Error(
          `Condition references filter ${idx}, but only ${filterCount} filter(s) were provided (indices are 1-based)`,
        );
      }
    }
  }

  // Syntax validation
  new ConditionSyntaxValidator(tokens).validate();
}
