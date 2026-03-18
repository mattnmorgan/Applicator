import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import Agent from "@/lib/system/agents/agent";
import Logger from "@/lib/system/logger";
import fs from "fs/promises";
import path from "path";

async function getLogDir(appId: string, agentId: string): Promise<string | null> {
  const agent = new Agent(appId, agentId, new Logger({ filename: "" }));
  return agent.getLogDirectory();
}

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const sessionId = request.cookies.get("session")?.value;
  if (!sessionId) return false;
  const session = await getSession(sessionId);
  if (!session) return false;
  return userHasAuthorization(session.user_id, "system:admin");
}

function safeLogId(logId: string): boolean {
  // Only allow filename-safe characters; no slashes or dots sequences
  return /^[\w\-]+$/.test(logId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string; logId: string }> },
) {
  try {
    const { appId, agentId, logId } = await params;

    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!safeLogId(logId)) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 });
    }

    const logDir = await getLogDir(appId, agentId);
    if (!logDir) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const logPath = path.join(logDir, `${logId}.log`);
    let content: string;
    try {
      content = await fs.readFile(logPath, "utf8");
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string; logId: string }> },
) {
  try {
    const { appId, agentId, logId } = await params;

    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!safeLogId(logId)) {
      return NextResponse.json({ error: "Invalid log ID" }, { status: 400 });
    }

    const logDir = await getLogDir(appId, agentId);
    if (!logDir) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
      await fs.unlink(path.join(logDir, `${logId}.log`));
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
