import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";

export const dynamic = "force-dynamic";
import AgentManager from "@/lib/managers/agent";
import Agent from "@/lib/system/agents/agent";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string }> },
) {
  try {
    const { appId, agentId } = await params;

    // Check authentication
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization - must be admin or the app checking its own agents
    const hasAdmin = await userHasAuthorization(
      session.user_id,
      "system:admin",
    );

    // Check if request is from the app itself (via X-App-Id header)
    const requestingAppId = request.headers.get("X-App-Id");
    const isOwnApp = requestingAppId === appId;

    if (!hasAdmin && !isOwnApp) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the agent - agentId is just the agent name, full ID is appId:agentName
    const agentManager = new AgentManager();
    const agent = await agentManager.readRecord(`${appId}:${agentId}`);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // DB is the source of truth for status. For continuous agents only, cross-check
    // the live process map to catch the brief window where a freshly-exited process
    // hasn't flushed its DB update yet.
    const agentInstance = new Agent(appId, agentId);
    const status = await agentInstance.getStatus();

    const inMemoryRunning = agentInstance.isRunning;
    const effectiveStatus =
      agent.data.status === "running" && !agent.data.cron && !inMemoryRunning
        ? "stopped"
        : status?.status ?? agent.data.status;

    return NextResponse.json({
      id: `${appId}:${agentId}`,
      name: agent.data.name,
      description: agent.data.description,
      app: agent.data.app,
      cron: agent.data.cron,
      status: effectiveStatus,
      lastRun: status?.lastRun ?? agent.data.last_run,
      lastError: status?.lastError ?? agent.data.last_error,
      nextRun: status?.nextRun,
      nextRunFormatted: status?.nextRunFormatted,
    });
  } catch (error) {
    console.error("Error getting agent status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
