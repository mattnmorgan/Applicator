import { NextRequest, NextResponse } from "next/server";
import TableManager from "@/lib/managers/table";
import { getSessionFromRequest } from "@/lib/managers/session";
import { createRecord } from "@/lib/database/crud/create";
import { readRecords } from "@/lib/database/crud/read";
import {
  bulkUpdateRecords as updateRecords,
  updateRecord,
} from "@/lib/database/crud/update";
import {
  bulkDeleteRecords as deleteRecords,
  deleteRecord,
  deleteAll,
} from "@/lib/database/crud/delete";
import { upsertRecord } from "@/lib/database/crud/upsert";
import FieldManager from "@/lib/managers/field";
import { createRecords } from "@/lib/client/database/crud/create";
import AppManager from "@/lib/managers/app";

/**
 * POST /api/[appId]/tables/[tableId]
 * Create one or multiple records in the specified table
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> },
) {
  try {
    const { appId, tableId } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.user_id;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const body = await request.json();

    // Handle bulk creation
    if (body.records && Array.isArray(body.records)) {
      return NextResponse.json(
        await createRecords(appId, tableId, body.records, true),
      );
    }

    // Single record creation
    if (!body?.data) {
      return NextResponse.json(
        { error: "No record data provided" },
        { status: 400 },
      );
    }

    const record = await createRecord(
      appId,
      tableId,
      tableRecord.data,
      body.data,
      {
        id: body.id,
      },
    );
    return NextResponse.json({ record });
  } catch (error) {
    console.error("Error creating record:", error);
    return NextResponse.json(
      {
        error: "Failed to create record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/[appId]/tables/[tableId]
 * Read records from the specified table with optional filtering
 * Query parameters:
 * - ids: comma-separated list of record IDs
 * - fields: JSON object for exact field equality filtering
 * - filters: JSON array of { field, operator, value } for complex filtering
 * - limit: maximum number of records to return
 * - offset: number of records to skip
 * - includeRelated: whether to include related records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> },
) {
  try {
    const { appId, tableId } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.user_id;

    // Load table definition
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    const fieldRecords = await fieldManager.loadTableFields(appId, tableId);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");
    const fieldsParam = searchParams.get("fields");
    const filtersParam = searchParams.get("filters");
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
          { status: 400 },
        );
      }
    }

    if (filtersParam) {
      try {
        options.filters = JSON.parse(filtersParam);
      } catch (e) {
        return NextResponse.json(
          { error: "Invalid filters parameter - must be valid JSON" },
          { status: 400 },
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

    const result = await readRecords(appId, tableId, fieldRecords, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error reading records:", error);
    return NextResponse.json(
      {
        error: "Failed to read records",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
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
  { params }: { params: Promise<{ appId: string; tableId: string }> },
) {
  try {
    const { appId, tableId } = await params;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const body = await request.json();

    // Handle bulk update
    if (body.updates && Array.isArray(body.updates)) {
      for (const update of body.updates) {
        if (!update.id || !update.data) {
          return NextResponse.json(
            { error: "Each update must have an id and data field" },
            { status: 400 },
          );
        }
      }
    } else if (!body.id || !body.data) {
      return NextResponse.json(
        {
          error: "Record update should containa an id and data fields",
        },
        { status: 400 },
      );
    }

    // Validate required permissions for app-specific authority updates
    if (appId === "system" && tableId === "authorities") {
      const updates = body.updates
        ? body.updates
        : [{ id: body.id, data: body.data }];

      for (const update of updates) {
        if (
          typeof update.id === "string" &&
          update.id.startsWith("app-specific:") &&
          update.data.authorizations
        ) {
          const targetAppId = update.id.replace("app-specific:", "");
          const appManager = new AppManager();
          const appRecord = await appManager.readRecord(targetAppId);

          if (appRecord?.data.required_permissions?.length) {
            const updatedAuthorizations: string[] = update.data.authorizations;
            const missing = appRecord.data.required_permissions.filter(
              (perm: string) => !updatedAuthorizations.includes(perm),
            );

            if (missing.length > 0) {
              return NextResponse.json(
                {
                  error: `Cannot remove required permissions: ${missing.join(", ")}`,
                },
                { status: 400 },
              );
            }
          }
        }
      }
    }

    return NextResponse.json(
      body.updates && Array.isArray(body.updates)
        ? await updateRecords(appId, tableId, tableRecord.data, body.updates)
        : await updateRecord(
            appId,
            tableId,
            tableRecord.data,
            body.id,
            body.data,
          ),
    );
  } catch (error) {
    console.error("Error updating record:", error);
    return NextResponse.json(
      {
        error: "Failed to update record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
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
  { params }: { params: Promise<{ appId: string; tableId: string }> },
) {
  try {
    const { appId, tableId } = await params;

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
        { status: 400 },
      );
    }

    return NextResponse.json(
      await upsertRecord(
        appId,
        tableId,
        tableRecord.data,
        body.id,
        body.data,
        {},
      ),
    );
  } catch (error) {
    console.error("Error upserting record:", error);
    return NextResponse.json(
      {
        error: "Failed to upsert record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/[appId]/tables/[tableId]
 * Delete one or multiple records from the specified table
 * Query parameters:
 * - deleteAll: boolean - Delete all records in the table
 * - id: string - Single record ID to delete
 * - ids: comma-separated list of record IDs to delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; tableId: string }> },
) {
  try {
    const { appId, tableId } = await params;

    // Load table definition
    const tableManager = new TableManager();
    const tableRecord = await tableManager.readRecord(`${appId}:${tableId}`);
    if (!tableRecord) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const deleteAllParam = searchParams.get("deleteAll");
    const idParam = searchParams.get("id");
    const idsParam = searchParams.get("ids");

    // Handle delete all
    if (deleteAllParam === "true") {
      await deleteAll(appId, tableId);
      return NextResponse.json({
        success: true,
        message: "All records deleted",
      });
    } else if (idsParam) {
      const ids = idsParam.split(",");
      return NextResponse.json(await deleteRecords(appId, tableId, ids));
    } else if (idParam) {
      return NextResponse.json(await deleteRecord(appId, tableId, idParam));
    }

    return NextResponse.json(
      { error: "Either id, ids, or deleteAll query parameter is required" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error deleting record:", error);
    return NextResponse.json(
      {
        error: "Failed to delete record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
