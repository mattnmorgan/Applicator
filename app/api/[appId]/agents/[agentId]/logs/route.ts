import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import Agent from "@/lib/system/agents/agent";
import Logger from "@/lib/system/logger";
import AgentExecutionManager from "@/lib/managers/agent-execution";
import fs from "fs/promises";
import path from "path";

async function getLogDir(appId: string, agentId: string): Promise<string | null> {
  const agent = new Agent(appId, agentId, new Logger({ filename: "" }));
  return agent.getLogDirectory();
}

async function requireAdmin(request: NextRequest): Promise<{ userId: string } | null> {
  const sessionId = request.cookies.get("session")?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  const hasAdmin = await userHasAuthorization(session.user_id, "system:admin");
  if (!hasAdmin) return null;
  return { userId: session.user_id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string }> },
) {
  try {
    const { appId, agentId } = await params;

    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentKey = `${appId}:${agentId}`;
    const manager = new AgentExecutionManager();
    const result = await manager.readRecords({
      filters: [{ field: "agent", operator: "=", value: agentKey }],
      limit: 200,
    });

    const logs = result.records
      .map((r) => ({
        id: r.id,
        timestamp: new Date(Number(r.data.timestamp)).toISOString(),
        success: r.data.status === "success" ? true : r.data.status === "failed" ? false : null,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string }> },
) {
  try {
    const { appId, agentId } = await params;

    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentKey = `${appId}:${agentId}`;
    const manager = new AgentExecutionManager();

    // Load records so we can delete the physical log files
    const result = await manager.readRecords({
      filters: [{ field: "agent", operator: "=", value: agentKey }],
      limit: 1000,
    });

    const logDir = await getLogDir(appId, agentId);
    let deleted = 0;

    for (const r of result.records) {
      if (logDir && r.data.log_file) {
        try {
          await fs.unlink(path.join(logDir, r.data.log_file));
        } catch {
          // File may already be gone
        }
      }
      try {
        await manager.deleteRecord(r.id);
        deleted++;
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({ deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
