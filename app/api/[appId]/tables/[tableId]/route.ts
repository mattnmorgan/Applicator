import { NextRequest, NextResponse } from "next/server";
import TableManager from "@/lib/database/managers/table";
import { getSessionFromRequest } from "@/lib/database/managers/session";
import { createRecord } from "@/lib/database/crud/create";
import { readRecords } from "@/lib/database/crud/read";
import { bulkUpdateRecords as updateRecords } from "@/lib/database/crud/update";
import { bulkDeleteRecords as deleteRecords } from "@/lib/database/crud/delete";
import { upsertRecord } from "@/lib/database/crud/upsert";

/**
 * POST /api/[appId]/tables/[tableId]
 * Create one or multiple records in the specified table
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const { appId, tableId } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const body = await request.json();

    // Handle bulk creation
    if (body.records && Array.isArray(body.records)) {
      const createdRecords = [];
      for (const recordData of body.records) {
        const result = await createRecord(appId, tableId, recordData, userId);
        createdRecords.push(result);
      }
      return NextResponse.json({
        records: createdRecords,
        count: createdRecords.length,
      });
    }

    // Handle single record creation
    const result = await createRecord(
      appId,
      tableId,
      body.data || body,
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating record:", error);
    return NextResponse.json(
      {
        error: "Failed to create record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/[appId]/tables/[tableId]
 * Read records from the specified table with optional filtering
 * Query parameters:
 * - ids: comma-separated list of record IDs
 * - fields: JSON object for field filtering
 * - limit: maximum number of records to return
 * - offset: number of records to skip
 * - includeRelated: whether to include related records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const { appId, tableId } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");
    const fieldsParam = searchParams.get("fields");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const includeRelatedParam = searchParams.get("includeRelated");

    const options: any = {};

    if (idsParam) {
      options.ids = idsParam.split(",");
    }

    if (fieldsParam) {
      try {
        options.fields = JSON.parse(fieldsParam);
      } catch (e) {
        return NextResponse.json(
          { error: "Invalid fields parameter - must be valid JSON" },
          { status: 400 }
        );
      }
    }

    if (limitParam) {
      options.limit = parseInt(limitParam, 10);
    }

    if (offsetParam) {
      options.offset = parseInt(offsetParam, 10);
    }

    if (includeRelatedParam) {
      options.includeRelated = includeRelatedParam === "true";
    }

    const result = await readRecords(appId, tableId, options, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error reading records:", error);
    return NextResponse.json(
      {
        error: "Failed to read records",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/[appId]/tables/[tableId]
 * Update one or multiple records in the specified table
 * Body can be:
 * - Single update: { id: string, data: object }
 * - Bulk update: { updates: [{ id: string, data: object }] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const { appId, tableId } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const body = await request.json();

    // Handle bulk update
    if (body.updates && Array.isArray(body.updates)) {
      const updatedRecords = [];
      for (const update of body.updates) {
        if (!update.id) {
          return NextResponse.json(
            { error: "Each update must have an id field" },
            { status: 400 }
          );
        }
        const result = await updateRecords(
          appId,
          tableId,
          [update.id],
          update.data,
          userId
        );
        if (result.records && result.records.length > 0) {
          updatedRecords.push(result.records[0]);
        }
      }
      return NextResponse.json({
        records: updatedRecords,
        count: updatedRecords.length,
      });
    }

    // Handle single record update
    if (!body.id) {
      return NextResponse.json(
        { error: "Record id is required" },
        { status: 400 }
      );
    }

    const result = await updateRecords(
      appId,
      tableId,
      [body.id],
      body.data,
      userId
    );

    if (!result.records || result.records.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(result.records[0]);
  } catch (error) {
    console.error("Error updating record:", error);
    return NextResponse.json(
      {
        error: "Failed to update record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/[appId]/tables/[tableId]
 * Upsert (create or update) a record in the specified table
 * Body: { id: string, data: object }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const { appId, tableId } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Record id is required for upsert" },
        { status: 400 }
      );
    }

    const result = await upsertRecord(
      appId,
      tableId,
      body.id,
      body.data,
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error upserting record:", error);
    return NextResponse.json(
      {
        error: "Failed to upsert record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/[appId]/tables/[tableId]
 * Delete one or multiple records from the specified table
 * Body can be:
 * - Single delete: { id: string }
 * - Bulk delete: { ids: string[] }
 * - Delete all: { deleteAll: true }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> }
) {
  try {
    const { appId, tableId } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const body = await request.json();

    // Handle delete all
    if (body.deleteAll === true) {
      const result = await deleteRecords(
        appId,
        tableId,
        undefined, // undefined ids means delete all
        userId
      );
      return NextResponse.json(result);
    }

    // Handle bulk delete
    if (body.ids && Array.isArray(body.ids)) {
      const result = await deleteRecords(appId, tableId, body.ids, userId);
      return NextResponse.json(result);
    }

    // Handle single record delete
    if (!body.id) {
      return NextResponse.json(
        { error: "Either id, ids array, or deleteAll flag is required" },
        { status: 400 }
      );
    }

    const result = await deleteRecords(appId, tableId, [body.id], userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting record:", error);
    return NextResponse.json(
      {
        error: "Failed to delete record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
