import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import SessionManager from "@/lib/database/managers/session";
import UserManager, { verifyPassword } from "@/lib/database/managers/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Get user by username
    const users = await new UserManager().readRecords({
      fields: { username: username },
    });
    if (!users.total) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      password,
      users.records[0].data.password_hash
    );
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!users.records[0].data.is_active) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const session = await new SessionManager().createSession(
      users.records[0].id
    );
    const cookieStore = await cookies();
    cookieStore.set("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: users.records[0],
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
