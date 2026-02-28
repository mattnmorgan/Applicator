"use client";

import { useState, useEffect, useCallback } from "react";
import Row from "../../utility/Row";
import Badge from "../../utility/Badge/Badge";
import styles from "./AgentList.module.css";
import AgentManager from "@/lib/client/managers/agent";
import Button from "../../utility/Button";

interface Agent {
  id: string;
  name: string;
  label?: string;
  description: string;
  app: string;
  appLabel: string;
  cron?: string;
  status: "stopped" | "running" | "scheduled" | "error";
  lastRun?: number;
  lastError?: string;
  nextRun?: string;
  nextRunFormatted?: string;
}

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const agentManager = new AgentManager();
      const response = await agentManager.listAllAgents();
      setAgents(response.agents || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const handleStartAgent = async (agent: Agent) => {
    setActionInProgress(agent.id);
    try {
      const agentManager = new AgentManager();
      await agentManager.startAgent(agent.app, agent.name);
      await fetchAgents();
    } catch (error: any) {
      console.error("Failed to start agent:", error);
      alert(`Failed to start agent: ${error.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRunNow = async (agent: Agent) => {
    setActionInProgress(agent.id);
    try {
      const agentManager = new AgentManager();
      await agentManager.runAgentNow(agent.app, agent.name);
      await fetchAgents();
    } catch (error: any) {
      console.error("Failed to run agent:", error);
      alert(`Failed to run agent: ${error.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStopAgent = async (agent: Agent) => {
    setActionInProgress(agent.id);
    try {
      const agentManager = new AgentManager();
      await agentManager.stopAgent(agent.app, agent.name);
      await fetchAgents();
    } catch (error: any) {
      console.error("Failed to stop agent:", error);
      alert(`Failed to stop agent: ${error.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      (agent.label || agent.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.app.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.appLabel.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="green">Running</Badge>;
      case "scheduled":
        return <Badge variant="blue">Scheduled</Badge>;
      case "error":
        return <Badge variant="red">Error</Badge>;
      default:
        return <Badge variant="gray">Stopped</Badge>;
    }
  };

  const formatLastRun = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading agents...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search agents by name, description, or app..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.agentList}>
        {filteredAgents.map((agent) => (
          <Row key={agent.id}>
            <div className={styles.agentInfo}>
              <div className={styles.contentColumn}>
                <div className={styles.agentHeader}>
                  <div className={styles.agentName}>{agent.label || agent.name}</div>
                  {getStatusBadge(agent.status)}
                </div>
                <div className={styles.agentDescription}>
                  {agent.description}
                </div>
                <div className={styles.agentMeta}>
                  {agent.cron && (
                    <span className={styles.metaItem}>
                      CRON: <code>{agent.cron}</code>
                    </span>
                  )}
                  {!agent.cron && (
                    <span className={styles.metaItem}>Continuous</span>
                  )}
                  {(agent.status === "running" || agent.status === "scheduled") && agent.nextRunFormatted && (
                    <span className={styles.metaItem}>
                      Next run: {agent.nextRunFormatted}
                    </span>
                  )}
                  {agent.lastRun && (
                    <span className={styles.metaItem}>
                      Last run: {formatLastRun(agent.lastRun)}
                      {agent.lastError ? (
                        <span className={styles.lastRunStatus}>
                          <span className={styles.failIcon}>✕</span>
                          <div className={styles.errorPopover}>
                            <div className={styles.errorPopoverTitle}>Last run failed</div>
                            <div className={styles.errorPopoverMessage}>{agent.lastError}</div>
                            <a href="/system/settings/debug/logs" className={styles.errorPopoverLink}>
                              View system logs →
                            </a>
                          </div>
                        </span>
                      ) : (
                        <span className={styles.successIcon}>✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.actionsColumn}>
              <Badge variant={agent.app === "system" ? "purple" : "blue"}>
                {agent.appLabel}
              </Badge>
              {agent.status === "scheduled" && (
                <Button
                  variant="secondary"
                  onClick={() => handleRunNow(agent)}
                  disabled={actionInProgress === agent.id}
                >
                  {actionInProgress === agent.id ? "..." : "Run Now"}
                </Button>
              )}
              {agent.status === "running" || agent.status === "scheduled" ? (
                <Button
                  variant="danger"
                  onClick={() => handleStopAgent(agent)}
                  disabled={actionInProgress === agent.id}
                >
                  {actionInProgress === agent.id ? "..." : agent.cron ? "Unschedule" : "Terminate"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleStartAgent(agent)}
                  disabled={actionInProgress === agent.id}
                >
                  {actionInProgress === agent.id ? "..." : agent.cron ? "Schedule" : "Launch"}
                </Button>
              )}
            </div>
          </Row>
        ))}

        {filteredAgents.length === 0 && !loading && (
          <div className={styles.emptyState}>
            {agents.length === 0
              ? "No agents installed. Install an app with agents to see them here."
              : "No agents match your search."}
          </div>
        )}
      </div>
    </div>
  );
}
