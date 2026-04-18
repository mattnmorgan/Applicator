import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import AgentManager from "@/lib/managers/agent";
import AppManager from "@/lib/managers/app";

export const dynamic = "force-dynamic";
import Agent from "@/lib/system/agents/agent";
import { getNextCronExecution, formatNextExecution } from "@/lib/system/cron";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;

    // Check authentication
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization - must be admin
    const hasAdmin = await userHasAuthorization(
      session.user_id,
      "system:admin",
    );
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get agents
    const agentManager = new AgentManager();
    const allAgents = await agentManager.readRecords();

    // Filter by app if not "system" (system shows all agents)
    const filteredAgents =
      appId === "system"
        ? allAgents.records
        : allAgents.records.filter((agent) => agent.data.app === appId);

    // Get all apps for labels
    const appManager = new AppManager();
    const allApps = await appManager.readRecords();
    const appLabels: Record<string, string> = {};
    for (const app of allApps.records) {
      appLabels[app.id] = app.data.label;
    }

    // Transform agents to response format
    const agents = filteredAgents.map((agent) => {
      let nextRun: string | null = null;
      let nextRunFormatted: string | null = null;

      if (agent.data.cron && (agent.data.status === "running" || agent.data.status === "scheduled")) {
        const nextExec = getNextCronExecution(agent.data.cron);
        if (nextExec) {
          nextRun = nextExec.toISOString();
          nextRunFormatted = formatNextExecution(nextExec);
        }
      }

      // Determine precise status:
      // - CRON agents in runningAgents but not executing → "scheduled"
      // - Any agent actively executing → "running"
      // - Not in runningAgents → use DB status
      let status: string = agent.data.status;
      if (Agent.isAgentRunning(agent.id)) {
        status =
          agent.data.cron && !Agent.isAgentExecuting(agent.id)
            ? "scheduled"
            : "running";
      }

      return {
        id: agent.id,
        name: agent.data.name,
        label: agent.data.label,
        description: agent.data.description,
        app: agent.data.app,
        appLabel: appLabels[agent.data.app] || agent.data.app,
        cron: agent.data.cron,
        manual: agent.data.manual ?? false,
        status,
        lastRun: agent.data.last_run ? Number(agent.data.last_run) : undefined,
        lastError: agent.data.last_error,
        nextRun,
        nextRunFormatted,
      };
    });

    return NextResponse.json({
      agents,
      total: agents.length,
    });
  } catch (error) {
    console.error("Error listing agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
