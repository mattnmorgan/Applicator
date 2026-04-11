"use client";

import { useState } from "react";
import LogManager from "@/lib/client/managers/log";
import { getCurrentUser } from "@/lib/client/managers/user";
import Button from "@/lib/components/utility/Button";
type LogLevel = "info" | "debug" | "error" | "warning";

export default function TestLogsPage() {
  const [isLoading, setIsLoading] = useState<LogLevel | null>(null);
  const [message, setMessage] = useState("");

  const handleCreateLog = async (level: LogLevel) => {
    setIsLoading(level);
    setMessage("");

    try {
      await new LogManager().createRecord({
        timestamp: `${Date.now()}`,
        sender: "system",
        level: level,
        message: `Test ${level} log created from test page`,
        user_id: (await getCurrentUser()).user.id,
      });
    } catch (error) {
      console.error("Error creating log:", error);
      setMessage("Error creating log.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#f1f5f9",
          marginBottom: "16px",
        }}
      >
        Test Logs
      </h1>

      <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
        Create test logs at different levels to verify the logging system is
        working correctly. Logs will be created with your user ID as the
        originator.
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Button variant="primary" onClick={() => handleCreateLog("info")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "info" ? 0.5 : 1}}>{isLoading === "info" ? "Creating..." : "Create Info Log"}</Button>

        <Button variant="secondary" onClick={() => handleCreateLog("debug")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "debug" ? 0.5 : 1, background: isLoading !== "debug" ? "#8b5cf6" : undefined}}>{isLoading === "debug" ? "Creating..." : "Create Debug Log"}</Button>

        <Button variant="danger" onClick={() => handleCreateLog("error")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "error" ? 0.5 : 1}}>{isLoading === "error" ? "Creating..." : "Create Error Log"}</Button>

        <Button variant="warning" onClick={() => handleCreateLog("warning")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "warning" ? 0.5 : 1}}>{isLoading === "warning" ? "Creating..." : "Create Warning Log"}</Button>
      </div>

      {message && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            borderRadius: "6px",
            background:
              message.includes("success") || message.includes("Check Settings")
                ? "#10b98120"
                : "#ef444420",
            border: `1px solid ${
              message.includes("success") || message.includes("Check Settings")
                ? "#10b981"
                : "#ef4444"
            }`,
            color:
              message.includes("success") || message.includes("Check Settings")
                ? "#34d399"
                : "#f87171",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
