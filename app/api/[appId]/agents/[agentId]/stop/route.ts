import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization } from "@/lib/database/managers/user";
import AgentManager from "@/lib/database/managers/agent";
import { stopAgent } from "@/lib/system/agents/agent-runner";

export async function POST(
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

    // Check authorization - must be admin or the app managing its own agents
    const hasAdmin = await userHasAuthorization(session.userId, "system:admin");

    // Check if request is from the app itself (via X-App-Id header)
    const requestingAppId = request.headers.get("X-App-Id");
    const isOwnApp = requestingAppId === appId;

    if (!hasAdmin && !isOwnApp) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the agent
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

    // Stop the agent
    await stopAgent(fullAgentId);

    return NextResponse.json({
      success: true,
      message: `Agent '${agent.data.name}' stopped`,
      status: "stopped",
    });
  } catch (error: any) {
    console.error("Error stopping agent:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
