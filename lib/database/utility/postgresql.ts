/**
 * PostgreSQL reserved words that must be quoted when used as identifiers.
 * Source: https://www.postgresql.org/docs/current/sql-keywords-appendix.html
 */
const RESERVED_WORDS = new Set([
  "all",
  "analyse",
  "analyze",
  "and",
  "any",
  "array",
  "as",
  "asc",
  "asymmetric",
  "authorization",
  "between",
  "binary",
  "both",
  "case",
  "cast",
  "check",
  "collate",
  "collation",
  "column",
  "concurrently",
  "constraint",
  "create",
  "cross",
  "current_catalog",
  "current_date",
  "current_role",
  "current_schema",
  "current_time",
  "current_timestamp",
  "current_user",
  "default",
  "deferrable",
  "desc",
  "distinct",
  "do",
  "else",
  "end",
  "except",
  "false",
  "fetch",
  "for",
  "foreign",
  "freeze",
  "from",
  "full",
  "grant",
  "group",
  "having",
  "ilike",
  "in",
  "initially",
  "inner",
  "intersect",
  "into",
  "is",
  "isnull",
  "join",
  "lateral",
  "leading",
  "left",
  "like",
  "limit",
  "localtime",
  "localtimestamp",
  "natural",
  "not",
  "notnull",
  "null",
  "offset",
  "on",
  "only",
  "or",
  "order",
  "outer",
  "overlaps",
  "placing",
  "primary",
  "references",
  "returning",
  "right",
  "select",
  "session_user",
  "similar",
  "some",
  "symmetric",
  "table",
  "tablesample",
  "then",
  "to",
  "trailing",
  "true",
  "union",
  "unique",
  "user",
  "using",
  "variadic",
  "verbose",
  "when",
  "where",
  "window",
  "with",
]);

/**
 * Check if a name is a PostgreSQL reserved word that requires quoting.
 */
export function isReserved(name: string): boolean {
  return RESERVED_WORDS.has(name.toLowerCase());
}

/**
 * Quote an identifier if it is a PostgreSQL reserved word.
 */
export function quoteIfReserved(name: string): string {
  return isReserved(name) ? `"${name}"` : name;
}

function needsJsonStringify(value: any): boolean {
  return (
    value !== null && typeof value === "object" && !(value instanceof Date)
  );
}

let _jsonbCache: Map<string, Set<string>> | null = null;
export function getJsonbColumns(tableName: string): Set<string> {
  if (!_jsonbCache) {
    // Lazy require to avoid circular dependency with schema classes
    // that also import from this module
    const schema = require("@/lib/database/schema").default;
    _jsonbCache = new Map();
    for (const table of schema.tables) {
      const cols = new Set<string>();
      for (const field of table.fields) {
        if (field.type === "jsonb") cols.add(field.name);
      }
      _jsonbCache.set(table.name, cols);
    }
  }
  return _jsonbCache.get(tableName) || new Set();
}

export function serializeValue(
  value: any,
  isJsonbColumn: boolean,
): any {
  if (value === null) return null;
  if (isJsonbColumn || needsJsonStringify(value)) return JSON.stringify(value);
  return value;
}
