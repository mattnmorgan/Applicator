import { PoolClient } from "pg";
import ReadResult from "@/lib/database/crud/types/read-result";
import RecordFilter from "@/lib/database/crud/types/record-filter";
import TableRecord from "@/lib/database/crud/types/record";
import Field from "@/lib/database/types/field";
import { getClient } from "@/lib/database/connections/postgresql";
import { quoteIfReserved } from "@/lib/database/schema/reserved";

export function readRecordWrapper<T = any>(appId: string, tableName: string) {
  return (id: string) => readRecord<T>(appId, tableName, id);
}

/**
 * Low-level SQL read for a single record.
 */
export async function sqlRead<T = any>(
  client: PoolClient,
  appId: string,
  tableName: string,
  id: string,
): Promise<TableRecord<T> | null> {
  if (appId === "system") {
    const result = await client.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const data: Record<string, any> = {};
    for (const [col, value] of Object.entries(row)) {
      if (col === "id" || col === "created_at" || col === "updated_at")
        continue;
      data[col] = value;
    }

    return {
      id,
      data: data as T,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
    };
  } else {
    const result = await client.query(
      `SELECT id, data, created_at, updated_at FROM records WHERE app_id = $1 AND table_name = $2 AND id = $3`,
      [appId, tableName, id],
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      data: row.data as T,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
    };
  }
}

/**
 * Low-level SQL read for multiple records with filtering and pagination.
 */
export async function sqlReadAll<T = any>(
  client: PoolClient,
  appId: string,
  tableName: string,
  filter?: {
    ids?: string[];
    fields?: Record<string, any>;
    limit?: number;
    offset?: number;
  },
): Promise<{ records: TableRecord<T>[]; total: number }> {
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

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    let query = `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at ASC`;
    const paginationParams = [...params];

    if (filter?.limit !== undefined) {
      query += ` LIMIT $${paramIdx}`;
      paginationParams.push(filter.limit);
      paramIdx++;
    }
    if (filter?.offset !== undefined) {
      query += ` OFFSET $${paramIdx}`;
      paginationParams.push(filter.offset);
      paramIdx++;
    }

    const result = await client.query(query, paginationParams);

    const records = result.rows.map((row) => {
      const data: Record<string, any> = {};
      for (const [col, value] of Object.entries(row)) {
        if (col === "id" || col === "created_at" || col === "updated_at")
          continue;
        data[col] = value;
      }
      return {
        id: row.id as string,
        data: data as T,
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
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

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM records ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    let query = `SELECT id, data, created_at, updated_at FROM records ${whereClause} ORDER BY created_at ASC`;
    const paginationParams = [...params];

    if (filter?.limit !== undefined) {
      query += ` LIMIT $${paramIdx}`;
      paginationParams.push(filter.limit);
      paramIdx++;
    }
    if (filter?.offset !== undefined) {
      query += ` OFFSET $${paramIdx}`;
      paginationParams.push(filter.offset);
      paramIdx++;
    }

    const result = await client.query(query, paginationParams);

    return {
      records: result.rows.map((row) => ({
        id: row.id,
        data: row.data as T,
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
      })),
      total,
    };
  }
}

/**
 * Read a single record. If a PoolClient is provided, uses it (for within-transaction reads).
 * Otherwise, acquires a new client for the read.
 */
export async function readRecord<T = any>(
  appId: string,
  tableName: string,
  recordId: string,
  client?: PoolClient,
): Promise<TableRecord<T> | null> {
  if (client) {
    return sqlRead<T>(client, appId, tableName, recordId);
  }

  const ownClient = await getClient();
  try {
    return await sqlRead<T>(ownClient, appId, tableName, recordId);
  } finally {
    ownClient.release();
  }
}

/**
 * Read multiple records with filtering, pagination, and optional related record inclusion.
 * If a PoolClient is provided, uses it (for within-transaction reads).
 */
export async function readRecords<T = any>(
  appId: string,
  tableName: string,
  tableFields: Field[],
  filter: RecordFilter<T> = {},
  client?: PoolClient,
): Promise<ReadResult<T>> {
  const { ids, fields, limit, offset = 0, includeRelated } = filter;

  const doRead = async (c: PoolClient): Promise<ReadResult<T>> => {
    const storageFilter: {
      ids?: string[];
      fields?: Record<string, any>;
      limit?: number;
      offset?: number;
    } = {};

    if (ids && ids.length > 0) {
      storageFilter.ids = ids;
    }
    if (fields && Object.keys(fields).length > 0) {
      storageFilter.fields = fields as Record<string, any>;
    }

    // Get total without pagination
    const totalResult = await sqlReadAll<T>(c, appId, tableName, {
      ids: storageFilter.ids,
      fields: storageFilter.fields,
    });
    const total = totalResult.total;

    // Get paginated results
    if (limit !== undefined) {
      storageFilter.limit = limit;
    }
    if (offset) {
      storageFilter.offset = offset;
    }

    const result = await sqlReadAll<T>(c, appId, tableName, storageFilter);
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
                  relatedRecords.push(relatedRecord);
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
