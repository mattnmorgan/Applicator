import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/managers/user";
import SessionManager from "@/lib/managers/session";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session")?.value || null;

    const manager = new SessionManager();
    const result = await manager.getSessionsByUserId(currentUser.user.id);

    // Filter out expired sessions and sort by created_at descending
    const now = new Date();
    const sessions = result.records
      .filter((r) => new Date(r.data.expires_at) > now)
      .sort((a, b) => b.created_at - a.created_at)
      .map((r) => ({
        id: r.id,
        device_name: r.data.device_name || "?",
        browser_name: r.data.browser_name || "?",
        device_type: r.data.device_type || "desktop",
        created_at: r.created_at,
        expires_at: r.data.expires_at,
        isCurrent: r.id === currentSessionId,
      }));

    return NextResponse.json({ sessions, currentSessionId });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const id = searchParams.get("id");

    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get("session")?.value || null;

    const manager = new SessionManager();
    const now = new Date().toISOString();

    if (all) {
      // Terminate all sessions for this user
      const result = await manager.getSessionsByUserId(currentUser.user.id);
      for (const r of result.records) {
        const table = await manager.getTable();
        await manager.updateRecord(table, r.id, {
          ...r.data,
          expires_at: now,
        });
      }
      return NextResponse.json({ success: true, terminatedCurrent: true });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Session id required" },
        { status: 400 },
      );
    }

    // Verify session belongs to current user
    const record = await manager.readRecord(id);
    if (!record || record.data.user_id !== currentUser.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const table = await manager.getTable();
    await manager.updateRecord(table, id, {
      ...record.data,
      expires_at: now,
    });

    return NextResponse.json({
      success: true,
      terminatedCurrent: id === currentSessionId,
    });
  } catch (error) {
    console.error("Failed to terminate session:", error);
    return NextResponse.json(
      { error: "Failed to terminate session" },
      { status: 500 },
    );
  }
}
