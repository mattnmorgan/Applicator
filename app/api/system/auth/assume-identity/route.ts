import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import UserManager, { getCurrentUser } from "@/lib/managers/user";
import SessionManager from "@/lib/managers/session";

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has assume-identity authorization
    if (
      !currentUser.authorizations.some((a) => a === "system:assume-identity")
    ) {
      return NextResponse.json(
        {
          error: "Forbidden - You do not have permission to assume identities",
        },
        { status: 403 },
      );
    }

    // Get target user ID from request
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Verify target user exists and is active
    const targetUser = await new UserManager().readRecord(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!targetUser.data.is_active) {
      return NextResponse.json(
        { error: "Cannot assume identity of inactive user" },
        { status: 400 },
      );
    }

    // Prevent assuming own identity
    if (targetUser.id === currentUser.user.id) {
      return NextResponse.json(
        { error: "Cannot assume your own identity" },
        { status: 400 },
      );
    }

    // Get current session ID
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session")?.value;
    if (!currentSessionId) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    // Create a new session for the assumed identity
    const newSession = await new SessionManager().createSession(
      targetUser.id,
      currentSessionId,
    );

    // Update the session cookie to use the new session
    cookieStore.set("session", newSession.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assumed identity of ${targetUser.data.display_name}`,
    });
  } catch (error) {
    console.error("Assume identity error:", error);
    return NextResponse.json(
      { error: "Failed to assume identity" },
      { status: 500 },
    );
  }
}
