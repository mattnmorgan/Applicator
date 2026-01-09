import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteContextualAuthority } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { app, id, user, authority, passwordTimestamp } = body;

    // Validate required fields
    if (!app || !id) {
      return NextResponse.json(
        { error: "Missing required fields: app, id" },
        { status: 400 }
      );
    }

    // Validate that exactly one of user, authority, or passwordTimestamp is provided
    const typeCount = [user, authority, passwordTimestamp].filter(
      (v) => v !== undefined
    ).length;
    if (typeCount !== 1) {
      return NextResponse.json(
        {
          error:
            "Must specify exactly one of: user, authority, or passwordTimestamp",
        },
        { status: 400 }
      );
    }

    // Delete the contextual authority
    const deleted = await deleteContextualAuthority(
      app,
      id,
      user,
      authority,
      passwordTimestamp
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Contextual authority not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contextual authority deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contextual authority:", error);
    return NextResponse.json(
      { error: "Failed to delete contextual authority" },
      { status: 500 }
    );
  }
}
