"use client";

import { useState, useEffect, useCallback } from "react";
import Row from "../../utility/Row";
import Badge from "../../utility/Badge/Badge";
import styles from "./AgentList.module.css";
import AgentManager from "@/lib/client/managers/agent";
import ButtonIcon from "../../utility/ButtonIcon";
import Tooltip from "../../utility/Tooltip";
import Icon from "../../utility/Icon";
import AgentLogViewer from "./AgentLogViewer";

interface Agent {
  id: string;
  name: string;
  label?: string;
  description: string;
  app: string;
  appLabel: string;
  cron?: string;
  manual?: boolean;
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
  const [logsAgent, setLogsAgent] = useState<Agent | null>(null);

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
    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? { ...a, status: "running" } : a)),
    );
    try {
      const agentManager = new AgentManager();
      await agentManager.runAgentNow(agent.app, agent.name);
      await fetchAgents();
    } catch (error: any) {
      console.error("Failed to run agent:", error);
      alert(`Failed to run agent: ${error.message}`);
      await fetchAgents();
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

  if (logsAgent) {
    return (
      <div className={styles.container}>
        <AgentLogViewer agent={logsAgent} onBack={() => setLogsAgent(null)} />
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
                  {agent.status === "scheduled" && agent.nextRunFormatted && (
                    <Tooltip text={`Next run: ${agent.nextRunFormatted}`} placement="top">
                      <span style={{ color: "#64748b", display: "inline-flex" }}>
                        <Icon name="info" size={13} />
                      </span>
                    </Tooltip>
                  )}
                  {agent.lastRun && (
                    <Tooltip
                      placement="top"
                      render={() => (
                        <div>
                          <div className={styles.lastRunPopoverLabel} style={{ color: agent.lastError ? "#ef4444" : "#34d399" }}>
                            {agent.lastError ? "Last run failed" : "Last run succeeded"}
                          </div>
                          <div className={styles.lastRunPopoverDate}>
                            {formatLastRun(agent.lastRun)}
                          </div>
                          {agent.lastError && (
                            <div className={styles.lastRunPopoverError}>
                              {agent.lastError}
                            </div>
                          )}
                          <a href="/system/settings/debug/logs" className={styles.lastRunPopoverLink}>
                            View system logs →
                          </a>
                        </div>
                      )}
                    >
                      <span style={{ color: agent.lastError ? "#ef4444" : "#34d399", display: "inline-flex" }}>
                        <Icon name={agent.lastError ? "close" : "check"} size={13} />
                      </span>
                    </Tooltip>
                  )}
                  <div className={styles.headerActions}>
                    {agent.manual ? (
                      <ButtonIcon
                        name="play"
                        label="Run Now"
                        onClick={() => handleRunNow(agent)}
                        disabled={actionInProgress === agent.id || agent.status === "running"}
                        subvariant="info"
                        placement="top"
                      />
                    ) : (
                      <>
                        {agent.status === "scheduled" && (
                          <ButtonIcon
                            name="play"
                            label="Run Now"
                            onClick={() => handleRunNow(agent)}
                            disabled={actionInProgress === agent.id}
                            subvariant="info"
                            placement="top"
                          />
                        )}
                        {agent.status === "running" || agent.status === "scheduled" ? (
                          <ButtonIcon
                            name="square-stop"
                            label={agent.cron ? "Unschedule" : "Terminate"}
                            onClick={() => handleStopAgent(agent)}
                            disabled={actionInProgress === agent.id || (!!agent.cron && agent.status === "running")}
                            subvariant="danger"
                            placement="top"
                          />
                        ) : (
                          <ButtonIcon
                            name="calendar"
                            label={agent.cron ? "Schedule" : "Launch"}
                            onClick={() => handleStartAgent(agent)}
                            disabled={actionInProgress === agent.id}
                            subvariant="info"
                            placement="top"
                          />
                        )}
                      </>
                    )}
                    <ButtonIcon
                      name="list-view"
                      label="Logs"
                      onClick={() => setLogsAgent(agent)}
                      placement="top"
                    />
                  </div>
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
                  {!agent.cron && !agent.manual && (
                    <span className={styles.metaItem}>Continuous</span>
                  )}
                  {agent.manual && (
                    <span className={styles.metaItem}>Manual</span>
                  )}
                  <span className={styles.appBadge}>
                    <Badge variant={agent.app === "system" ? "purple" : "blue"}>
                      {agent.appLabel}
                    </Badge>
                  </span>
                </div>
              </div>
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
