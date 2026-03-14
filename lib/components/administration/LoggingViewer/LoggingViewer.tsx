"use client";

import TableRecord from "@/lib/database/crud/types/record";
import React, { useState, useEffect } from "react";
import styles from "./LoggingViewer.module.css";
import Button from "@/lib/components/utility/Button";
import Icon from "@/lib/components/utility/Icon";
import Log from "@/lib/database/types/log";
import LogManager from "@/lib/client/managers/log";
import UserManager from "@/lib/client/managers/user";
import { getSystemSettings } from "@/lib/client/database/crud/";

function formatTimestamp(ts: string): string {
  const date = new Date(Number(ts));
  if (isNaN(date.getTime())) return ts;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}

export default function LoggingViewer() {
  const [logs, setLogs] = useState<TableRecord<Log>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const limit = 100;

  const fetchLoggingStatus = async () => {
    try {
      setLoggingEnabled((await getSystemSettings()).loggingEnabled === "true");
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
      const newLogs = await new LogManager().readRecords({
        limit: limit,
        offset: currentOffset,
      });

      if (reset) {
        setLogs(newLogs.records);
        setOffset(newLogs.records.length);
      } else {
        setLogs([...logs, ...newLogs.records]);

        setOffset(offset + newLogs.records.length);
      }
      setTotalCount(newLogs.total);
      setHasMore(currentOffset + newLogs.records.length < newLogs.total);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await new LogManager().deleteAll(false);
      setLogs([]);
      setOffset(0);
      setTotalCount(0);
      setHasMore(false);
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
    new UserManager()
      .readRecords({})
      .then((result) => {
        const map: Record<string, string> = {};
        for (const u of result.records) {
          map[u.id] = u.data.username;
        }
        setUserMap(map);
      })
      .catch(() => {});

    const interval = setInterval(() => fetchLogs(true), 15000);
    return () => clearInterval(interval);
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

  logs.sort((a, b) => b.created_at - a.created_at);

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
          <Button variant="secondary" onClick={refreshLogs} disabled={loading}>
            <Icon name="refresh" size={16} />
            Refresh
          </Button>

          <Button
            variant="danger"
            onClick={clearLogs}
            disabled={loading || logs.length === 0}
          >
            <Icon name="trash" size={16} />
            Clear
          </Button>
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
                    <div className={styles.logMeta}>
                      <span
                        className={styles.logLevel}
                        style={{ color: getLevelColor(log.data.level) }}
                      >
                        {log.data.level}
                      </span>
                      <span className={styles.logTimestamp}>
                        {formatTimestamp(log.data.timestamp)}
                      </span>
                      <span className={styles.logSender}>
                        [{log.data.sender}]
                      </span>
                      {log.data.user_id && (
                        <span className={styles.logUserId}>
                          {userMap[log.data.user_id] ||
                            log.data.user_id.substring(0, 8)}
                        </span>
                      )}
                    </div>
                    <span className={styles.logMessage}>
                      {log.data.message}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className={styles.loadMore}>
                  <Button
                    variant="secondary"
                    onClick={loadMoreLogs}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </Button>
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
