"use client";

import { useState, useEffect, useCallback } from "react";
import Badge from "../../utility/Badge/Badge";
import ButtonIcon from "../../utility/ButtonIcon";
import Icon from "../../utility/Icon";
import Tooltip from "../../utility/Tooltip";

interface LogEntry {
  id: string;
  timestamp: string;
  success: boolean | null;
}

interface AgentInfo {
  app: string;
  appLabel: string;
  name: string;
  label?: string;
}

interface Props {
  agent: AgentInfo;
  onBack: () => void;
}

export default function AgentLogViewer({ agent, onBack }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingLog, setViewingLog] = useState<{ id: string; content: string; timestamp: string } | null>(null);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/${agent.app}/agents/${agent.name}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {}
    setLoading(false);
  }, [agent.app, agent.name]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleView = async (log: LogEntry) => {
    setLoadingContent(log.id);
    try {
      const res = await fetch(`/api/${agent.app}/agents/${agent.name}/logs/${log.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingLog({ id: log.id, content: data.content, timestamp: log.timestamp });
      }
    } catch {}
    setLoadingContent(null);
  };

  const handleDeleteOne = async (id: string) => {
    try {
      const res = await fetch(`/api/${agent.app}/agents/${agent.name}/logs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
        if (viewingLog?.id === id) setViewingLog(null);
      }
    } catch {}
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch(`/api/${agent.app}/agents/${agent.name}/logs`, { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
        setViewingLog(null);
      }
    } catch {}
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const formatTimeOnly = (ts: string) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (viewingLog) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Log panel header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "1px solid #1e293b",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500, flex: 1 }}>
            Execution on {formatTimestamp(viewingLog.timestamp)}
          </span>
          <ButtonIcon
            name="close"
            label="Close log"
            onClick={() => setViewingLog(null)}
            placement="top"
            size="sm"
          />
        </div>

        {/* Scrollable log content */}
        <pre
          style={{
            margin: 0,
            padding: "12px 14px",
            overflowY: "auto",
            flex: 1,
            color: "#94a3b8",
            fontSize: 12,
            fontFamily: "monospace",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {viewingLog.content || "(empty)"}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ButtonIcon
          name="chevron-left"
          label="Back to agents"
          onClick={onBack}
          placement="bottom"
        />
        <span style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 600 }}>
          {agent.label || agent.name}
        </span>
        <Badge variant={agent.app === "system" ? "purple" : "blue"}>
          {agent.appLabel}
        </Badge>
        <div style={{ marginLeft: "auto" }}>
          <ButtonIcon
            name="trash"
            label="Delete all logs"
            onClick={handleDeleteAll}
            subvariant="danger"
            placement="bottom"
            disabled={logs.length === 0}
          />
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div style={{ color: "#64748b", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
          Loading logs…
        </div>
      ) : logs.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
          No execution logs found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 6,
              }}
            >
              {/* Status icon */}
              <Tooltip
                text={log.success === null ? "Unknown" : log.success ? "Success" : "Failed"}
                placement="top"
              >
                <span
                  style={{
                    display: "inline-flex",
                    color: log.success === null ? "#64748b" : log.success ? "#34d399" : "#ef4444",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={log.success === false ? "close" : "check"} size={14} />
                </span>
              </Tooltip>

              {/* Timestamp */}
              <span style={{ color: "#94a3b8", fontSize: 13, flex: 1, fontVariantNumeric: "tabular-nums" }}>
                {formatTimestamp(log.timestamp)}
              </span>

              {/* Actions */}
              <ButtonIcon
                name="eye"
                label="View log"
                onClick={() => handleView(log)}
                disabled={loadingContent === log.id}
                placement="top"
                size="sm"
              />
              <ButtonIcon
                name="trash"
                label="Delete log"
                onClick={() => handleDeleteOne(log.id)}
                subvariant="danger"
                placement="top"
                size="sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
