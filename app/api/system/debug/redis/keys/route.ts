import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getClient } from "@/lib/database/pg/transaction";
import schema from "@/lib/database/schema";

export async function GET() {
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

    const client = await getClient();
    try {
      const keys: string[] = [];

      // System tables
      for (const tableName of schema.tables.map((t) => t.name).filter((n) => n !== "records")) {
        const result = await client.query(
          `SELECT id FROM ${tableName} ORDER BY id`
        );
        for (const row of result.rows) {
          keys.push(`${tableName}:${row.id}`);
        }
      }

      // App records
      const result = await client.query(
        `SELECT app_id, table_name, id FROM records ORDER BY app_id, table_name, id`
      );
      for (const row of result.rows) {
        keys.push(`sandbox:${row.app_id}:${row.table_name}:${row.id}`);
      }

      return NextResponse.json({ keys });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to fetch database keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch database keys" },
      { status: 500 }
    );
  }
}
