import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSystemSetting, setSystemSetting } from "@/lib/db";
import { clearLogs } from "@/lib/logging";

/**
 * GET /api/system/logging-enabled
 * Get the current logging enabled setting
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin authorization
    const user = await getCurrentUser();
    if (!user || !user.authorizations.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get logging enabled setting (defaults to false if not set)
    const enabled = (await getSystemSetting("loggingEnabled")) === "true";

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error("Failed to get logging enabled setting:", error);
    return NextResponse.json(
      { error: "Failed to get logging enabled setting" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system/logging-enabled
 * Update the logging enabled setting
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin authorization
    const user = await getCurrentUser();
    if (!user || !user.authorizations.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // If logging is being disabled, clear all existing logs
    if (!enabled) {
      await clearLogs();
    }

    // Save the setting
    await setSystemSetting("loggingEnabled", enabled ? "true" : "false");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update logging enabled setting:", error);
    return NextResponse.json(
      { error: "Failed to update logging enabled setting" },
      { status: 500 }
    );
  }
}
