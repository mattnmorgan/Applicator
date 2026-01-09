import { NextRequest, NextResponse } from "next/server";
import { getSession, getContextualAuthoritiesByResourceId } from "@/lib/db";

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
    const { app, id } = body;

    // Validate required fields
    if (!app || !id) {
      return NextResponse.json(
        { error: "Missing required fields: app, id" },
        { status: 400 }
      );
    }

    // Fetch contextual authorities for the resource
    const authorities = await getContextualAuthoritiesByResourceId(app, id);

    // Strip out password hashes before returning
    const sanitizedAuthorities = authorities.map((auth) => ({
      ...auth,
      password: auth.password ? "[PROTECTED]" : undefined,
    }));

    return NextResponse.json({
      success: true,
      authorities: sanitizedAuthorities,
    });
  } catch (error) {
    console.error("Error fetching contextual authorities:", error);
    return NextResponse.json(
      { error: "Failed to fetch contextual authorities" },
      { status: 500 }
    );
  }
}
