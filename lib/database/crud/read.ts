import { PoolClient } from "pg";
import ReadResult from "@/lib/database/crud/types/read-result";
import RecordFilter, {
  FieldFilter,
  JoinSpec,
} from "@/lib/database/crud/types/record-filter";
import TableRecord from "@/lib/database/crud/types/record";
import Field from "@/lib/database/types/field";
import { getClient } from "@/lib/database/connections/postgresql";
import { quoteIfReserved } from "@/lib/database/utility/postgresql";
import {
  buildSystemCondition,
  buildJsonbCondition,
  applyFilters,
} from "@/lib/database/crud/processor";

export function readRecordWrapper<T = any, J = Record<string, any>>(
  appId: string,
  tableName: string,
) {
  return (id: string, client?: PoolClient, joins?: JoinSpec[]) =>
    readRecord<T, J>(appId, tableName, id, client, joins);
}

/**
 * Low-level SQL read for a single record.
 */
export async function sqlRead<T = any, J = Record<string, any>>(
  client: PoolClient,
  appId: string,
  tableName: string,
  id: string,
  joins?: JoinSpec[],
): Promise<TableRecord<T, J> | null> {
  if (appId === "system") {
    let query: string;
    if (joins && joins.length > 0) {
      const joinSelects = joins
        .map((j, i) => `row_to_json(__j${i}.*) AS "__joined_${j.as}"`)
        .join(", ");
      const joinClauses = joins
        .map((j, i) => `LEFT JOIN ${j.table} __j${i} ON __j${i}.id = r.${j.on}`)
        .join("\n");
      query = `SELECT r.*, ${joinSelects} FROM ${tableName} r\n${joinClauses}\nWHERE r.id = $1`;
    } else {
      query = `SELECT * FROM ${tableName} WHERE id = $1`;
    }

    const result = await client.query(query, [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const data: { [k: string]: unknown } = {};
    const joined: { [k: string]: unknown } = {};
    for (const [col, value] of Object.entries(row)) {
      if (col === "id" || col === "created_at" || col === "updated_at")
        continue;
      if (col.startsWith("__joined_")) {
        joined[col.slice("__joined_".length)] = value;
      } else {
        data[col] = value;
      }
    }

    return {
      id,
      data: data as T,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      ...(Object.keys(joined).length > 0 ? { joined: joined as any } : {}),
    };
  } else {
    let query: string;
    if (joins && joins.length > 0) {
      const joinSelects = joins
        .map((j, i) => `row_to_json(__j${i}.*) AS "__joined_${j.as}"`)
        .join(", ");
      const joinClauses = joins
        .map(
          (j, i) =>
            `LEFT JOIN ${j.table} __j${i} ON __j${i}.id = (r.data->>'${j.on}')`,
        )
        .join("\n");
      query = `SELECT r.id, r.data, r.created_at, r.updated_at, ${joinSelects} FROM records r\n${joinClauses}\nWHERE r.app_id = $1 AND r.table_name = $2 AND r.id = $3`;
    } else {
      query = `SELECT id, data, created_at, updated_at FROM records WHERE app_id = $1 AND table_name = $2 AND id = $3`;
    }

    const result = await client.query(query, [appId, tableName, id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const joined: { [k: string]: unknown } = {};
    for (const [col, value] of Object.entries(row)) {
      if (col.startsWith("__joined_")) {
        joined[col.slice("__joined_".length)] = value;
      }
    }

    return {
      id: row.id,
      data: row.data as T,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      ...(Object.keys(joined).length > 0 ? { joined: joined as any } : {}),
    };
  }
}

/**
 * Low-level SQL read for multiple records with filtering and pagination.
 */
export async function sqlReadAll<T = any, J = Record<string, any>>(
  client: PoolClient,
  appId: string,
  tableName: string,
  filter?: {
    ids?: string[];
    fields?: { [k: string]: unknown };
    filters?: FieldFilter[];
    condition?: string;
    limit?: number;
    offset?: number;
    joins?: JoinSpec[];
  },
): Promise<{ records: TableRecord<T, J>[]; total: number }> {
  if (appId === "system") {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filter?.ids && filter.ids.length > 0) {
      const placeholders = filter.ids
        .map((_, i) => `$${paramIdx + i}`)
        .join(", ");
      conditions.push(`id IN (${placeholders})`);
      params.push(...filter.ids);
      paramIdx += filter.ids.length;
    }

    if (filter?.fields) {
      for (const [col, value] of Object.entries(filter.fields)) {
        conditions.push(`${quoteIfReserved(col)} = $${paramIdx}`);
        params.push(value);
        paramIdx++;
      }
    }

    if (filter?.filters && filter.filters.length > 0) {
      paramIdx = applyFilters(
        filter.filters,
        filter.condition,
        buildSystemCondition,
        conditions,
        params,
        paramIdx,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const joins = filter?.joins;
    const paginationParams = [...params];

    let innerQuery = `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at ASC`;
    if (filter?.limit !== undefined) {
      innerQuery += ` LIMIT $${paramIdx}`;
      paginationParams.push(filter.limit);
      paramIdx++;
    }
    if (filter?.offset !== undefined) {
      innerQuery += ` OFFSET $${paramIdx}`;
      paginationParams.push(filter.offset);
      paramIdx++;
    }

    let query: string;
    if (joins && joins.length > 0) {
      const joinSelects = joins
        .map((j, i) => `row_to_json(__j${i}.*) AS "__joined_${j.as}"`)
        .join(", ");
      const joinClauses = joins
        .map(
          (j, i) => `LEFT JOIN ${j.table} __j${i} ON __j${i}.id = base.${j.on}`,
        )
        .join("\n");
      query = `SELECT base.*, ${joinSelects}\nFROM (\n  ${innerQuery}\n) base\n${joinClauses}`;
    } else {
      query = innerQuery;
    }

    const result = await client.query(query, paginationParams);

    const records = result.rows.map((row) => {
      const data: { [k: string]: unknown } = {};
      const joined: { [k: string]: unknown } = {};
      for (const [col, value] of Object.entries(row)) {
        if (col === "id" || col === "created_at" || col === "updated_at")
          continue;
        if (col.startsWith("__joined_")) {
          joined[col.slice("__joined_".length)] = value;
        } else {
          data[col] = value;
        }
      }
      return {
        id: row.id as string,
        data: data as T,
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
        ...(Object.keys(joined).length > 0 ? { joined: joined as any } : {}),
      };
    });

    return { records, total };
  } else {
    const conditions: string[] = [`app_id = $1`, `table_name = $2`];
    const params: any[] = [appId, tableName];
    let paramIdx = 3;

    if (filter?.ids && filter.ids.length > 0) {
      const placeholders = filter.ids
        .map((_, i) => `$${paramIdx + i}`)
        .join(", ");
      conditions.push(`id IN (${placeholders})`);
      params.push(...filter.ids);
      paramIdx += filter.ids.length;
    }

    if (filter?.fields) {
      for (const [fieldName, value] of Object.entries(filter.fields)) {
        conditions.push(`data->>$${paramIdx} = $${paramIdx + 1}`);
        params.push(fieldName, String(value));
        paramIdx += 2;
      }
    }

    if (filter?.filters && filter.filters.length > 0) {
      paramIdx = applyFilters(
        filter.filters,
        filter.condition,
        buildJsonbCondition,
        conditions,
        params,
        paramIdx,
      );
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM records ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const joins = filter?.joins;
    const paginationParams = [...params];

    let innerQuery = `SELECT id, data, created_at, updated_at FROM records ${whereClause} ORDER BY created_at ASC`;
    if (filter?.limit !== undefined) {
      innerQuery += ` LIMIT $${paramIdx}`;
      paginationParams.push(filter.limit);
      paramIdx++;
    }
    if (filter?.offset !== undefined) {
      innerQuery += ` OFFSET $${paramIdx}`;
      paginationParams.push(filter.offset);
      paramIdx++;
    }

    let query: string;
    if (joins && joins.length > 0) {
      const joinSelects = joins
        .map((j, i) => `row_to_json(__j${i}.*) AS "__joined_${j.as}"`)
        .join(", ");
      const joinClauses = joins
        .map(
          (j, i) =>
            `LEFT JOIN ${j.table} __j${i} ON __j${i}.id = (base.data->>'${j.on}')`,
        )
        .join("\n");
      query = `SELECT base.id, base.data, base.created_at, base.updated_at, ${joinSelects}\nFROM (\n  ${innerQuery}\n) base\n${joinClauses}`;
    } else {
      query = innerQuery;
    }

    const result = await client.query(query, paginationParams);

    return {
      records: result.rows.map((row) => {
        const joined: { [k: string]: unknown } = {};
        for (const [col, value] of Object.entries(row)) {
          if (col.startsWith("__joined_")) {
            joined[col.slice("__joined_".length)] = value;
          }
        }
        return {
          id: row.id,
          data: row.data as T,
          created_at: Number(row.created_at),
          updated_at: Number(row.updated_at),
          ...(Object.keys(joined).length > 0 ? { joined: joined as any } : {}),
        };
      }),
      total,
    };
  }
}

/**
 * Read a single record. If a PoolClient is provided, uses it (for within-transaction reads).
 * Otherwise, acquires a new client for the read.
 */
export async function readRecord<T = any, J = Record<string, any>>(
  appId: string,
  tableName: string,
  recordId: string,
  client?: PoolClient,
  joins?: JoinSpec[],
): Promise<TableRecord<T, J> | null> {
  if (client) {
    return sqlRead<T, J>(client, appId, tableName, recordId, joins);
  }

  const ownClient = await getClient();
  try {
    return await sqlRead<T, J>(ownClient, appId, tableName, recordId, joins);
  } finally {
    ownClient.release();
  }
}

/**
 * Read multiple records with filtering, pagination, and optional related record inclusion.
 * If a PoolClient is provided, uses it (for within-transaction reads).
 */
export async function readRecords<T = any, J = Record<string, any>>(
  appId: string,
  tableName: string,
  tableFields: Field[],
  filter: RecordFilter<T> = {},
  client?: PoolClient,
): Promise<ReadResult<T, J>> {
  const {
    ids,
    fields,
    filters,
    condition,
    limit,
    offset = 0,
    includeRelated,
    joins,
  } = filter;

  const doRead = async (c: PoolClient): Promise<ReadResult<T, J>> => {
    const storageFilter: {
      ids?: string[];
      fields?: Record<string, any>;
      filters?: FieldFilter[];
      condition?: string;
      limit?: number;
      offset?: number;
    } = {};

    if (ids && ids.length > 0) {
      storageFilter.ids = ids;
    }
    if (fields && Object.keys(fields).length > 0) {
      storageFilter.fields = fields as Record<string, any>;
    }
    if (filters && filters.length > 0) {
      storageFilter.filters = filters;
    }
    if (condition) {
      storageFilter.condition = condition;
    }

    // Get total without pagination
    const totalResult = await sqlReadAll<T, J>(c, appId, tableName, {
      ids: storageFilter.ids,
      fields: storageFilter.fields,
      filters: storageFilter.filters,
      condition: storageFilter.condition,
    });
    const total = totalResult.total;

    // Get paginated results
    if (limit !== undefined) {
      storageFilter.limit = limit;
    }
    if (offset) {
      storageFilter.offset = offset;
    }

    const result = await sqlReadAll<T, J>(c, appId, tableName, {
      ...storageFilter,
      joins,
    });
    const paginatedRecords = result.records;

    // Fetch related records if requested
    let related: Record<string, Record<string, TableRecord[]>> | undefined;
    if (includeRelated && includeRelated.length > 0) {
      related = {};

      for (const record of paginatedRecords) {
        const recordRelated: Record<string, TableRecord[]> = {};

        for (const relationshipFieldName of includeRelated) {
          const relationshipField = tableFields.find(
            (f: Field) =>
              f.name === relationshipFieldName && f.type === "relationship",
          );

          if (relationshipField && relationshipField.related_to) {
            const relatedTo = relationshipField.related_to;
            let targetAppId = appId;
            let targetTableName = relatedTo;

            if (relatedTo.includes(":")) {
              [targetAppId, targetTableName] = relatedTo.split(":");
            }

            const relationshipValue = (record.data as any)[
              relationshipFieldName
            ];

            if (relationshipValue) {
              const relatedIds = Array.isArray(relationshipValue)
                ? relationshipValue
                : [relationshipValue];

              const relatedRecords: TableRecord[] = [];
              for (const relatedId of relatedIds) {
                const relatedRecord = await sqlRead(
                  c,
                  targetAppId,
                  targetTableName,
                  relatedId,
                );
                if (relatedRecord) {
                  relatedRecords.push(relatedRecord as any);
                }
              }

              recordRelated[relationshipFieldName] = relatedRecords;
            } else {
              recordRelated[relationshipFieldName] = [];
            }
          }
        }

        related[record.id] = recordRelated;
      }
    }

    return {
      records: paginatedRecords,
      total,
      limit: limit != undefined ? limit : total,
      offset,
      ...(related && { related }),
    };
  };

  if (client) {
    return doRead(client);
  }

  const ownClient = await getClient();
  try {
    return await doRead(ownClient);
  } finally {
    ownClient.release();
  }
}
