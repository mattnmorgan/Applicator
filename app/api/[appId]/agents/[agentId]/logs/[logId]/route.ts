import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";

export const dynamic = "force-dynamic";
import Agent from "@/lib/system/agents/agent";
import Logger from "@/lib/system/logger";
import AgentExecutionManager from "@/lib/managers/agent-execution";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string; logId: string }> },
) {
  try {
    const { appId, agentId, logId } = await params;

    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await new AgentExecutionManager().readRecord(logId);
    if (!record || !record.data.log_file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const logDir = await getLogDir(appId, agentId);
    if (!logDir) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const logPath = path.join(logDir, record.data.log_file);
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

    const manager = new AgentExecutionManager();
    const record = await manager.readRecord(logId);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (record.data.log_file) {
      const logDir = await getLogDir(appId, agentId);
      if (logDir) {
        try {
          await fs.unlink(path.join(logDir, record.data.log_file));
        } catch {
          // File may already be gone
        }
      }
    }

    await manager.deleteRecord(logId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
