"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Button from "@/lib/components/utility/Button";
import Badge from "@/lib/components/utility/Badge/Badge";
import Banner from "@/lib/components/utility/Banner";
import Spinner from "@/lib/components/utility/Spinner";
import Icon from "@/lib/components/utility/Icon/Icon";

interface SessionEntry {
  id: string;
  device_name: string;
  browser_name: string;
  device_type: string;
  created_at: number;
  expires_at: string;
  isCurrent: boolean;
}

function deviceIcon(deviceType: string) {
  if (deviceType === "mobile") return "smartphone";
  if (deviceType === "tablet") return "tablet";
  return "monitor";
}

function formatDate(createdAt: number) {
  return new Date(createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [terminating, setTerminating] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/system/settings/sessions");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load sessions");
        return;
      }
      setSessions(data.sessions);
    } catch {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const terminate = async (id: string, isCurrent: boolean) => {
    setTerminating(id);
    setError("");
    try {
      const res = await fetch(
        `/api/system/settings/sessions?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to terminate session");
        return;
      }
      if (isCurrent) {
        router.push("/system/login");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("Failed to terminate session");
    } finally {
      setTerminating(null);
    }
  };

  const terminateAll = async () => {
    setTerminatingAll(true);
    setError("");
    try {
      const res = await fetch("/api/system/settings/sessions?all=true", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to terminate sessions");
        return;
      }
      router.push("/system/login");
    } catch {
      setError("Failed to terminate sessions");
    } finally {
      setTerminatingAll(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Sessions</h2>
        {sessions.length > 0 && (
          <Button
            variant="danger"
            onClick={terminateAll}
            disabled={terminatingAll}
          >
            {terminatingAll ? "Terminating..." : "Terminate All"}
          </Button>
        )}
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      {loading ? (
        <div className={styles.spinnerWrap}>
          <Spinner />
        </div>
      ) : sessions.length === 0 ? (
        <p className={styles.empty}>No active sessions found.</p>
      ) : (
        <div className={styles.list}>
          {sessions.map((session) => (
            <div key={session.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <span className={styles.deviceIcon}>
                  <Icon name={deviceIcon(session.device_type)} size={20} />
                </span>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTitle}>
                    <span className={styles.deviceName}>
                      {session.device_name}
                    </span>
                    {session.isCurrent && (
                      <Badge variant="green" shape="square">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className={styles.cardMeta}>
                    {session.browser_name !== "?"
                      ? session.browser_name
                      : "Unknown browser"}
                    {" · "}
                    Signed in {formatDate(session.created_at)}
                  </div>
                </div>
              </div>
              <Button
                variant="danger"
                onClick={() => terminate(session.id, session.isCurrent)}
                disabled={terminating === session.id || terminatingAll}
              >
                {terminating === session.id ? "Terminating..." : "Terminate"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
