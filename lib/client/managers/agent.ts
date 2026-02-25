import CRUD from "@/lib/client/database/crud/";
import Agent from "@/lib/database/types/agent";

export default class Manager extends CRUD<Agent> {
  tableId = "agents";
  appId = "system";

  /**
   * Start an agent
   */
  async startAgent(appId: string, agentName: string): Promise<any> {
    const response = await fetch(`/api/${appId}/agents/${agentName}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to start agent");
    }

    return response.json();
  }

  /**
   * Stop an agent
   */
  async stopAgent(appId: string, agentName: string): Promise<any> {
    const response = await fetch(`/api/${appId}/agents/${agentName}/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to stop agent");
    }

    return response.json();
  }

  /**
   * Immediately execute a CRON agent without waiting for its schedule
   */
  async runAgentNow(appId: string, agentName: string): Promise<any> {
    const response = await fetch(`/api/${appId}/agents/${agentName}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to execute agent");
    }

    return response.json();
  }

  /**
   * Get agent status
   */
  async getAgentStatus(appId: string, agentName: string): Promise<any> {
    const response = await fetch(`/api/${appId}/agents/${agentName}/status`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get agent status");
    }

    return response.json();
  }

  /**
   * List all agents (admin only)
   * Uses system appId to get all agents across all apps
   */
  async listAllAgents(): Promise<any> {
    const response = await fetch("/api/system/agents");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list agents");
    }

    return response.json();
  }

  /**
   * List agents for a specific app
   */
  async listAgentsForApp(appId: string): Promise<any> {
    const response = await fetch(`/api/${appId}/agents`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list agents");
    }

    return response.json();
  }
}
