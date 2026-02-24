import { FieldFilter } from "@/lib/database/crud/types/record-filter";
import ConditionBuilder from "@/lib/database/crud/processor/types/condition-builder";
import {
  validateCondition,
  tokenizeCondition,
} from "@/lib/database/crud/processor/condition";
import ConditionSqlBuilder from "@/lib/database/crud/processor/condition-sql-builder";
import { quoteIfReserved } from "@/lib/database/utility/postgresql";

/**
 * Append filter SQL to `conditions`. Handles both the condition string and
 * the default AND-of-all fallback. Returns the next paramIdx.
 */
export function applyFilters(
  filters: FieldFilter[],
  condition: string | undefined,
  buildOne: ConditionBuilder,
  conditions: string[],
  params: any[],
  paramIdx: number,
): number {
  if (condition) {
    validateCondition(condition, filters.length);
    const tokens = tokenizeCondition(condition);
    const builder = new ConditionSqlBuilder(
      tokens,
      filters,
      buildOne,
      params,
      paramIdx,
    );
    conditions.push(builder.build());
    return builder.paramIdx;
  }
  // Default: AND all filters
  for (const filter of filters) {
    const [sql, next] = buildOne(filter, params, paramIdx);
    conditions.push(sql);
    paramIdx = next;
  }
  return paramIdx;
}

/**
 * Build a single SQL fragment for a typed system table column.
 * Returns [sql, next paramIdx].
 */
export function buildSystemCondition(
  filter: FieldFilter,
  params: any[],
  paramIdx: number,
): [string, number] {
  const col = quoteIfReserved(filter.field);
  if (filter.operator === "IN" || filter.operator === "NOT IN") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const placeholders = values.map((_, i) => `$${paramIdx + i}`).join(", ");
    params.push(...values);
    return [
      `${col} ${filter.operator} (${placeholders})`,
      paramIdx + values.length,
    ];
  }
  params.push(filter.value);
  return [`${col} ${filter.operator} $${paramIdx}`, paramIdx + 1];
}

/**
 * Build a single SQL fragment for a JSONB records table field.
 * Auto-casts to ::numeric when the value is a number.
 * Returns [sql, next paramIdx].
 */
export function buildJsonbCondition(
  filter: FieldFilter,
  params: any[],
  paramIdx: number,
): [string, number] {
  if (filter.operator === "IN" || filter.operator === "NOT IN") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const allNumeric = values.every((v) => typeof v === "number");
    const accessor = allNumeric
      ? `(data->>$${paramIdx})::numeric`
      : `data->>$${paramIdx}`;
    const placeholders = values
      .map((_, i) => `$${paramIdx + 1 + i}`)
      .join(", ");
    params.push(filter.field, ...values);
    return [
      `${accessor} ${filter.operator} (${placeholders})`,
      paramIdx + 1 + values.length,
    ];
  }
  const isNumeric = typeof filter.value === "number";
  const accessor = isNumeric
    ? `(data->>$${paramIdx})::numeric`
    : `data->>$${paramIdx}`;
  params.push(filter.field, filter.value);
  return [`${accessor} ${filter.operator} $${paramIdx + 1}`, paramIdx + 2];
}
