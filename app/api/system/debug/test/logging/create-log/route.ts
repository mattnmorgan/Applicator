import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/managers/user";
import LogManager from "@/lib/database/managers/log";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { level, message } = body;

    if (!level || !message) {
      return NextResponse.json(
        { error: "level and message are required" },
        { status: 400 }
      );
    }

    try {
      await new LogManager().createLog(level, message, "system");
    } catch (error) {
      console.error("Log failed to create");
    }

    return NextResponse.json({
      success: true,
      message: `${level} log created. Check Settings → Debug → Logs`,
    });
  } catch (error) {
    console.error("[TEST] Error logging:", error);
    return NextResponse.json(
      {
        error: "Failed to create log",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
