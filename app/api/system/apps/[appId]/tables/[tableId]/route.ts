import { NextRequest, NextResponse } from "next/server";
import LogManager from "@/lib/database/managers/log";
import { createRecord, bulkCreateRecords } from "@/lib/database/crud/create";
import { updateRecord, bulkUpdateRecords } from "@/lib/database/crud/update";
import { bulkDeleteRecords, deleteAll } from "@/lib/database/crud/delete";
import { readRecords } from "@/lib/database/crud/read";
import { getSessionFromRequest } from "@/lib/database/managers/session";
import TableManager from "@/lib/database/managers/table";
import Table from "@/lib/database/types/table";

/**
 * Process password fields in data by hashing them
 * @param table The table definition
 * @param data The data to process
 * @returns Processed data with hashed passwords
 */
async function hashPasswordFields(
  table: Table | null,
  data: any
): Promise<any> {
  if (!table) return data;

  const passwordFields = table.fields.filter(
    (field) => field.type === "password"
  );
  if (passwordFields.length === 0) return data;

  const bcrypt = await import("bcryptjs");
  const processedData = { ...data };

  for (const field of passwordFields) {
    const value = processedData[field.name];
    if (value && typeof value === "string") {
      // Only hash if it's not already a bcrypt hash (bcrypt hashes start with $2)
      if (!value.startsWith("$2")) {
        processedData[field.name] = await bcrypt.hash(value, 10);
      }
    }
  }

  return processedData;
}

/**
 * POST - Create one or more records
 * Body: { records: Array<{ id?: string, data: object }> } or { data: object, id?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appId, tableId } = await params;

    // Load table definition
    const tableManager = new TableManager();
    const table = await tableManager.loadTable(appId, tableId);
    if (!table) {
      return NextResponse.json(
        { error: `Table ${tableId} not found in app ${appId}` },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Support both single record and bulk creation
    if (body.records && Array.isArray(body.records)) {
      // Bulk create
      const dataArray = await Promise.all(
        body.records.map((r: any) => hashPasswordFields(table, r.data))
      );

      const result = await bulkCreateRecords(appId, tableId, table, dataArray);

      if (result.failures.length > 0) {
        // Some records failed
        await new LogManager().warn(
          "system",
          `Bulk create failed for ${appId}:${tableId}: ${result.failures.length} failures`
        );

        return NextResponse.json(
          {
            success: false,
            created: result.success,
            failures: result.failures,
          },
          { status: 400 }
        );
      }

      await new LogManager().info(
        "system",
        `Bulk created ${result.success.length} records in ${appId}:${tableId}`
      );

      return NextResponse.json({
        success: true,
        records: result.success,
      });
    } else {
      // Single create
      const { data, id } = body;

      // Hash password fields if present
      const processedData = await hashPasswordFields(table, data);

      const record = await createRecord(appId, tableId, table, processedData, {
        id,
      });

      await new LogManager().info(
        "system",
        `Created record ${record.id} in ${appId}:${tableId}`
      );

      return NextResponse.json({
        success: true,
        record,
      });
    }
  } catch (error) {
    console.error("Failed to create record(s):", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create record(s)",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Read/filter records
 * Query params: ids (comma-separated), fields (JSON), limit, offset
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appId, tableId } = await params;

    // Load table definition
    const tableManager = new TableManager();
    const table = await tableManager.loadTable(appId, tableId);
    if (!table) {
      return NextResponse.json(
        { error: `Table ${tableId} not found in app ${appId}` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const idsParam = searchParams.get("ids");
    const fieldsParam = searchParams.get("fields");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const ids = idsParam ? idsParam.split(",") : undefined;
    const fields = fieldsParam ? JSON.parse(fieldsParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    const result = await readRecords(appId, tableId, {
      ids,
      fields,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Failed to read records:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to read records",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update one or more records
 * Body: { updates: Array<{ id: string, data: object }> } or { id: string, data: object }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appId, tableId } = await params;

    // Load table definition
    const tableManager = new TableManager();
    const table = await tableManager.loadTable(appId, tableId);
    if (!table) {
      return NextResponse.json(
        { error: `Table ${tableId} not found in app ${appId}` },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Support both single record and bulk update
    if (body.updates && Array.isArray(body.updates)) {
      // Bulk update - hash password fields if present
      const updates = await Promise.all(
        body.updates.map(async (update: any) => ({
          ...update,
          data: await hashPasswordFields(table, update.data),
        }))
      );

      const result = await bulkUpdateRecords(appId, tableId, table, updates);

      if (result.failures.length > 0) {
        // Some records failed
        await new LogManager().warn(
          "system",
          `Bulk update failed for ${appId}:${tableId}: ${result.failures.length} failures`
        );

        return NextResponse.json(
          {
            success: false,
            updated: result.success,
            failures: result.failures,
          },
          { status: 400 }
        );
      }

      await new LogManager().info(
        "system",
        `Bulk updated ${result.success.length} records in ${appId}:${tableId}`
      );

      return NextResponse.json({
        success: true,
        records: result.success,
      });
    } else {
      // Single update
      const { id, data } = body;

      // Hash password fields if present
      const processedData = await hashPasswordFields(table, data);

      const record = await updateRecord(
        appId,
        tableId,
        table,
        id,
        processedData
      );

      if (!record) {
        return NextResponse.json(
          { error: `Record ${id} not found` },
          { status: 404 }
        );
      }

      await new LogManager().info(
        "system",
        `Updated record ${id} in ${appId}:${tableId}`
      );

      return NextResponse.json({
        success: true,
        record,
      });
    }
  } catch (error) {
    console.error("Failed to update record(s):", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update record(s)",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete one or more records
 * Body: { ids: string[] } or query param: id=<single-id>
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appId, tableId } = await params;

    // Load table definition (mainly for logging/validation)
    const table = await new TableManager().loadTable(appId, tableId);
    if (!table) {
      return NextResponse.json(
        { error: `Table ${tableId} not found in app ${appId}` },
        { status: 404 }
      );
    }

    // Try to get IDs from query param first
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const doDeleteAll = searchParams.get("deleteAll") == "true";

    let ids: string[];

    if (idParam) {
      // Single delete via query param
      ids = [idParam];
    } else if (!doDeleteAll) {
      // Bulk delete via body
      const body = await request.json();
      ids = body.ids;

      if (!ids || !Array.isArray(ids)) {
        return NextResponse.json(
          { error: "ids array is required in request body" },
          { status: 400 }
        );
      }
    }

    if (doDeleteAll) {
      await deleteAll(appId, tableId);
      await new LogManager().info(
        "system",
        `Deleted all records from ${appId}:${tableId}`
      );
    } else {
      await bulkDeleteRecords(appId, tableId, ids);
      await new LogManager().info(
        "system",
        `Deleted ${ids.length} records from ${appId}:${tableId}`
      );
    }

    return NextResponse.json({
      success: true,
      deleted: doDeleteAll ? -1 : ids.length,
    });
  } catch (error) {
    console.error("Failed to delete record(s):", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete record(s)",
      },
      { status: 500 }
    );
  }
}
