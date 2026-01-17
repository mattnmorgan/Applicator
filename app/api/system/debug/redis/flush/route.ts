import { NextResponse } from "next/server";
import LogManager from "@/lib/database/managers/log";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getRedisClient } from "@/lib/database/crud/redis";

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

    await new LogManager().createLog("info", "Database was flushed", "system");
    await getRedisClient().flushdb();

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
