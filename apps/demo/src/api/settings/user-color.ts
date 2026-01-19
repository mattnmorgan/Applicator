import { NextRequest, NextResponse } from "next/server";
import { createRecord, bulkCreateRecords } from "@/lib/database/crud/create";
import { readRecord, readRecords } from "@/lib/database/crud/read";
import { updateRecord } from "@/lib/database/crud/update";
import TableManager from "@/lib/database/managers/table";
import FieldManager from "@/lib/database/managers/field";

const APP_ID = "demo";
const TABLE_NAME = "user-color";

/**
 * GET /api/demo/settings/user-color
 *
 * Get the current user's color preference from the database.
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

    // Get all user-color records
    const result = await readRecords(APP_ID, TABLE_NAME, tableFields, {
      limit: 1000,
    });

    // Find the record for this user
    const userRecord = result.records.find(
      (r: any) => r.data.userId === plugin.userId
    );

    if (!userRecord) {
      return NextResponse.json({
        color: null,
        message: "No color preference set",
      });
    }

    return NextResponse.json({
      color: userRecord.data.color,
      recordId: userRecord.id,
    });
  } catch (error: any) {
    console.error("Error getting user color:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/demo/settings/user-color
 *
 * Save the current user's color preference to the database.
 */
export async function POST(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Check if user already has a color record
    const result = await readRecords(APP_ID, TABLE_NAME, tableFields, {
      limit: 1000,
    });
    const existingRecord = result.records.find(
      (r: any) => r.data.userId === plugin.userId
    );

    if (existingRecord) {
      // Update existing record
      await updateRecord(APP_ID, TABLE_NAME, table, existingRecord.id, {
        color,
      });

      return NextResponse.json({
        success: true,
        message: "Color preference updated",
        color,
        recordId: existingRecord.id,
      });
    } else {
      // Create new record
      const newRecord = await createRecord(APP_ID, TABLE_NAME, table, {
        userId: plugin.userId,
        color,
      });

      return NextResponse.json({
        success: true,
        message: "Color preference saved",
        color,
        recordId: newRecord.id,
      });
    }
  } catch (error: any) {
    console.error("Error saving user color:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
