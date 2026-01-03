import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logging";

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

    // Log with the user ID as the app context
    const appContext = `system`;

    switch (level) {
      case "info":
        await logger.info(appContext, message, user.id);
        break;
      case "debug":
        await logger.debug(appContext, message, user.id);
        break;
      case "error":
        await logger.error(appContext, message, user.id);
        break;
      case "warning":
        await logger.warn(appContext, message, user.id);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid log level. Use: info, debug, error, warning" },
          { status: 400 }
        );
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
