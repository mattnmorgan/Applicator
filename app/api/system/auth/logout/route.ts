import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import SessionManager, { getSession } from "@/lib/managers/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (sessionId) {
      const session = await getSession(sessionId);

      if (session?.original_session_id) {
        await new SessionManager().deleteRecord(sessionId);
        cookieStore.set("session", session.original_session_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return NextResponse.json({ success: true, unassumed: true });
      } else {
        await new SessionManager().deleteRecord(sessionId);
        cookieStore.delete("session");
        return NextResponse.json({ success: true });
      }
    }

    cookieStore.delete("session");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
