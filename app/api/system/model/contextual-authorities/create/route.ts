import { NextRequest, NextResponse } from "next/server";
import { getSession, createContextualAuthority } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    const { id, permission, app, user, authority, password } = body;

    // Validate required fields
    if (!id || !permission || !app) {
      return NextResponse.json(
        { error: "Missing required fields: id, permission, app" },
        { status: 400 }
      );
    }

    // Validate that exactly one of user, authority, or password is provided
    const typeCount = [user, authority, password].filter((v) => v !== undefined).length;
    if (typeCount !== 1) {
      return NextResponse.json(
        { error: "Must specify exactly one of: user, authority, or password" },
        { status: 400 }
      );
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create the contextual authority
    const contextualAuthority = await createContextualAuthority(
      id,
      permission,
      app,
      session.userId, // createdBy
      user,
      authority,
      hashedPassword
    );

    return NextResponse.json({
      success: true,
      contextualAuthority: {
        ...contextualAuthority,
        password: undefined, // Don't return the hashed password
      },
    });
  } catch (error) {
    console.error("Error creating contextual authority:", error);
    return NextResponse.json(
      { error: "Failed to create contextual authority" },
      { status: 500 }
    );
  }
}
