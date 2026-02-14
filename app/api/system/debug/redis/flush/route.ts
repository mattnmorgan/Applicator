import { NextResponse } from "next/server";
import LogManager from "@/lib/database/managers/log";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getClient } from "@/lib/database/pg/transaction";
import schema from "@/lib/database/schema";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.authorizations.some((a) => a === "system:admin")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    await new LogManager().createLog("info", "Database was flushed", "system");

    const client = await getClient();
    try {
      // Truncate app records first
      await client.query(`TRUNCATE records`);

      // Truncate system tables (junction tables are handled by CASCADE)
      for (const tableName of schema.tables.map((t) => t.name).filter((n) => n !== "records")) {
        await client.query(`TRUNCATE ${tableName} CASCADE`);
      }
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: "Database flushed successfully",
    });
  } catch (error) {
    console.error("Failed to flush database:", error);
    return NextResponse.json(
      { error: "Failed to flush database" },
      { status: 500 }
    );
  }
}
