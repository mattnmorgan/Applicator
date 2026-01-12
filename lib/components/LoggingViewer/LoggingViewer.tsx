"use client";

import Log from "@/lib/database/types/log";
import TableRecord from "@/lib/database/crud/types/record";
import React, { useState, useEffect } from "react";
import styles from "./LoggingViewer.module.css";

export default function LoggingViewer() {
  const [logs, setLogs] = useState<TableRecord<Log>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 100;

  const fetchLoggingStatus = async () => {
    try {
      const response = await fetch("/api/system/settings");
      if (response.ok) {
        const data = await response.json();
        setLoggingEnabled(data.settings.loggingEnabled);
      }
    } catch (error) {
      console.error("Failed to fetch logging status:", error);
    }
  };

  const fetchLogs = async (reset: boolean = false) => {
    setLoading(true);
    try {
      // Check logging status first
      await fetchLoggingStatus();

      const currentOffset = reset ? 0 : offset;
      const response = await fetch(
        `/api/system/apps/system/tables/log?limit=${limit}&offset=${currentOffset}`
      );
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setLogs(data.records);
          setOffset(data.records.length);
        } else {
          setLogs([...logs, ...data.records]);
          setOffset(offset + data.records.length);
        }
        setTotalCount(data.total);
        setHasMore(currentOffset + data.records.length < data.total);
      } else {
        console.error("Failed to fetch logs");
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      const response = await fetch(
        "/api/system/apps/system/tables/log?deleteAll=true",
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setLogs([]);
        setOffset(0);
        setTotalCount(0);
        setHasMore(false);
      } else {
        console.error("Failed to clear logs");
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  const refreshLogs = () => {
    fetchLogs(true);
  };

  const loadMoreLogs = () => {
    if (!loading && hasMore) {
      fetchLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, []);

  const getLevelColor = (level: string): string => {
    switch (level) {
      case "debug":
        return "#34d399"; // green
      case "info":
        return "#3b82f6"; // blue
      case "warning":
        return "#fbbf24"; // yellow
      case "error":
        return "#ef4444"; // red
      default:
        return "#94a3b8"; // slate-400
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Logging</h1>
          <p className={styles.subtitle}>
            View system and application logs ({totalCount} total messages)
          </p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={refreshLogs}
            disabled={loading}
            className={styles.refreshButton}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.65 2.35C12.2 0.9 10.21 0 8 0 3.58 0 0 3.58 0 8h2c0-3.31 2.69-6 6-6 1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z"
                fill="currentColor"
              />
            </svg>
            Refresh
          </button>

          <button
            onClick={clearLogs}
            disabled={loading || logs.length === 0}
            className={styles.clearButton}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h12v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4zm3-3h6l1 1H2l1-1z"
                fill="currentColor"
              />
            </svg>
            Clear
          </button>
        </div>
      </div>

      <div className={styles.logsContainer}>
        <div className={styles.logsScroll}>
          {!loggingEnabled ? (
            <div className={styles.emptyState}>
              <p style={{ margin: 0, marginBottom: "8px" }}>
                Enable to capture debug logs
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Go to Settings → Home to enable logging
              </p>
            </div>
          ) : logs.length === 0 && !loading ? (
            <div className={styles.emptyState}>No log messages found</div>
          ) : (
            <div>
              {logs.map((log, index) => (
                <div key={index} className={styles.logEntry}>
                  <div className={styles.logContent}>
                    <span
                      className={styles.logLevel}
                      style={{ color: getLevelColor(log.data.level) }}
                    >
                      {log.data.level}
                    </span>
                    <span className={styles.logTimestamp}>
                      {log.data.timestamp}
                    </span>
                    <span className={styles.logSender}>
                      [{log.data.sender}]
                    </span>
                    {log.data.userId && (
                      <span className={styles.logUserId}>
                        user:{log.data.userId.substring(0, 8)}
                      </span>
                    )}
                    <span className={styles.logMessage}>
                      {log.data.message}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className={styles.loadMore}>
                  <button
                    onClick={loadMoreLogs}
                    disabled={loading}
                    className={styles.loadMoreButton}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && logs.length === 0 && (
        <div className={styles.loadingOverlay}>Loading logs...</div>
      )}
    </div>
  );
}
