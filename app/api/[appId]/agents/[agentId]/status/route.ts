import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization } from "@/lib/database/managers/user";
import AgentManager from "@/lib/database/managers/agent";
import { getAgentStatus } from "@/lib/system/agents/agent-runner";
import { getNextCronExecution, formatNextExecution } from "@/lib/system/cron";

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
    const hasAdmin = await userHasAuthorization(session.userId, "system:admin");

    // Check if request is from the app itself (via X-App-Id header)
    const requestingAppId = request.headers.get("X-App-Id");
    const isOwnApp = requestingAppId === appId;

    if (!hasAdmin && !isOwnApp) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the agent - agentId is just the agent name, full ID is appId:agentName
    const fullAgentId = `${appId}:${agentId}`;
    const agentManager = new AgentManager();
    const agent = await agentManager.readRecord(fullAgentId);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify the agent belongs to the requested app
    if (agent.data.app !== appId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get status from runner
    const status = await getAgentStatus(fullAgentId);

    // Calculate next run for CRON agents
    let nextRun: string | null = null;
    let nextRunFormatted: string | null = null;
    if (agent.data.cron) {
      const nextExec = getNextCronExecution(agent.data.cron);
      if (nextExec) {
        nextRun = nextExec.toISOString();
        nextRunFormatted = formatNextExecution(nextExec);
      }
    }

    return NextResponse.json({
      id: fullAgentId,
      name: agent.data.name,
      description: agent.data.description,
      app: agent.data.app,
      cron: agent.data.cron,
      status: status?.status || agent.data.status,
      lastRun: status?.lastRun || agent.data.lastRun,
      lastError: status?.lastError || agent.data.lastError,
      nextRun,
      nextRunFormatted,
    });
  } catch (error) {
    console.error("Error getting agent status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
