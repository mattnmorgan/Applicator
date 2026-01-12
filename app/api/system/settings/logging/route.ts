import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization, getSystemSetting, setSystemSetting } from "@/lib/database/helpers";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loggingEnabled = await getSystemSetting("loggingEnabled");
    return NextResponse.json({
      loggingEnabled: loggingEnabled === "true"
    });
  } catch (error) {
    console.error("Error fetching logging setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAdmin = await userHasAuthorization(session.userId, "admin");
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { loggingEnabled } = await request.json();

    if (typeof loggingEnabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid loggingEnabled value" },
        { status: 400 }
      );
    }

    await setSystemSetting("loggingEnabled", String(loggingEnabled));

    return NextResponse.json({ success: true, loggingEnabled });
  } catch (error) {
    console.error("Error updating logging setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
