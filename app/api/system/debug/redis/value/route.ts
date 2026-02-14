import { NextResponse } from "next/server";
import LogManager from "@/lib/database/managers/log";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getClient } from "@/lib/database/pg/transaction";
import schema from "@/lib/database/schema";
import { sqlRead } from "@/lib/database/crud/read";
import { sqlUpdate } from "@/lib/database/crud/update";
import { sqlDelete } from "@/lib/database/crud/delete";

function parseKey(key: string): {
  appId: string;
  tableName: string;
  id: string;
} | null {
  // App records: sandbox:{appId}:{tableName}:{id...}
  if (key.startsWith("sandbox:")) {
    const rest = key.slice("sandbox:".length);
    const firstColon = rest.indexOf(":");
    if (firstColon === -1) return null;
    const appId = rest.slice(0, firstColon);
    const afterAppId = rest.slice(firstColon + 1);
    const secondColon = afterAppId.indexOf(":");
    if (secondColon === -1) return null;
    const tableName = afterAppId.slice(0, secondColon);
    const id = afterAppId.slice(secondColon + 1);
    return { appId, tableName, id };
  }

  // System tables: {tableName}:{id...}
  for (const tableName of schema.tables.map((t) => t.name).filter((n) => n !== "records")) {
    const prefix = `${tableName}:`;
    if (key.startsWith(prefix)) {
      return { appId: "system", tableName, id: key.slice(prefix.length) };
    }
  }

  return null;
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Key parameter is required" },
        { status: 400 }
      );
    }

    const parsed = parseKey(key);
    if (!parsed) {
      return NextResponse.json({ key, value: null });
    }

    const client = await getClient();
    try {
      const record = await sqlRead(
        client,
        parsed.appId,
        parsed.tableName,
        parsed.id,
      );
      return NextResponse.json({
        key,
        value: record ? JSON.stringify(record.data) : null,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to fetch database value:", error);
    return NextResponse.json(
      { error: "Failed to fetch database value" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    const parsed = parseKey(key);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid key format" },
        { status: 400 }
      );
    }

    const data = JSON.parse(value);

    const client = await getClient();
    try {
      await sqlUpdate(
        client,
        parsed.appId,
        parsed.tableName,
        parsed.id,
        data,
        Date.now(),
      );
    } finally {
      client.release();
    }

    await new LogManager().createLog(
      "info",
      `Database key "${key}" was modified`,
      "system"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update database value:", error);
    return NextResponse.json(
      { error: "Failed to update database value" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Key parameter is required" },
        { status: 400 }
      );
    }

    const parsed = parseKey(key);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid key format" },
        { status: 400 }
      );
    }

    const client = await getClient();
    try {
      await sqlDelete(
        client,
        parsed.appId,
        parsed.tableName,
        parsed.id,
      );
    } finally {
      client.release();
    }

    await new LogManager().createLog(
      "info",
      'Database key was deleted: "' + key + '"',
      "system"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete database key:", error);
    return NextResponse.json(
      { error: "Failed to delete database key" },
      { status: 500 }
    );
  }
}
