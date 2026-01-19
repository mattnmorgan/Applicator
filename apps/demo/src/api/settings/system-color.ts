import { NextRequest, NextResponse } from "next/server";
import { createRecord } from "@/lib/database/crud/create";
import { readRecords } from "@/lib/database/crud/read";
import { updateRecord } from "@/lib/database/crud/update";
import TableManager from "@/lib/database/managers/table";
import FieldManager from "@/lib/database/managers/field";

const APP_ID = "demo";
const TABLE_NAME = "system-color";
const SYSTEM_COLOR_ID = "system-default"; // Single record for system-wide color

/**
 * GET /api/demo/settings/system-color
 *
 * Get the system-wide color preference from the database.
 */
export async function GET(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load the table fields
    const fieldManager = new FieldManager();
    const fieldsResult = await fieldManager.readRecords({
      fields: { app: APP_ID, table: TABLE_NAME },
    });
    const tableFields = fieldsResult.records.map((r: any) => r.data);

    // Get all system-color records (there should be only one)
    const result = await readRecords(APP_ID, TABLE_NAME, tableFields, {
      limit: 1,
    });

    if (result.records.length === 0) {
      return NextResponse.json({
        color: null,
        message: "No system color preference set",
      });
    }

    const systemRecord = result.records[0];
    return NextResponse.json({
      color: systemRecord.data.color,
      recordId: systemRecord.id,
    });
  } catch (error: any) {
    console.error("Error getting system color:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/demo/settings/system-color
 *
 * Save the system-wide color preference to the database.
 * Requires admin authorization.
 */
export async function POST(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin authorization
    const isAdmin = await plugin.system.checkMyAuthorization("system:admin");
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { color } = body;

    if (!color || typeof color !== "string") {
      return NextResponse.json(
        { error: "Color is required" },
        { status: 400 }
      );
    }

    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: "Invalid color format. Use hex format (e.g., #FF0000)" },
        { status: 400 }
      );
    }

    // Load the table
    const tableManager = new TableManager();
    const table = await tableManager.loadTable(APP_ID, TABLE_NAME);

    // Load the table fields
    const fieldManager = new FieldManager();
    const fieldsResult = await fieldManager.readRecords({
      fields: { app: APP_ID, table: TABLE_NAME },
    });
    const tableFields = fieldsResult.records.map((r: any) => r.data);

    // Check if system color record exists
    const result = await readRecords(APP_ID, TABLE_NAME, tableFields, {
      limit: 1,
    });

    if (result.records.length > 0) {
      // Update existing record
      const existingRecord = result.records[0];
      await updateRecord(APP_ID, TABLE_NAME, table, existingRecord.id, {
        color,
      });

      return NextResponse.json({
        success: true,
        message: "System color preference updated",
        color,
        recordId: existingRecord.id,
      });
    } else {
      // Create new record
      const newRecord = await createRecord(APP_ID, TABLE_NAME, table, {
        color,
      }, { id: SYSTEM_COLOR_ID });

      return NextResponse.json({
        success: true,
        message: "System color preference saved",
        color,
        recordId: newRecord.id,
      });
    }
  } catch (error: any) {
    console.error("Error saving system color:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
