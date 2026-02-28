"use client";

import { useState } from "react";
import NotificationManager from "@/lib/client/managers/notification";
import { getCurrentUser } from "@/lib/client/managers/user";
import Button from "@/lib/components/utility/Button";
type NotificationType = "info" | "success" | "warning" | "error";

export default function TestNotificationsPage() {
  const [isLoading, setIsLoading] = useState<NotificationType | null>(null);
  const [message, setMessage] = useState("");

  const handleSendNotification = async (type: NotificationType) => {
    setIsLoading(type);
    setMessage("");

    try {
      await new NotificationManager().createRecord(
        {
          type: type,
          message: "This is a test notification",
          timestamp: Date.now(),
          user_id: (await getCurrentUser()).user.id,
          app: "system",
          title: "Test Notification (" + type + ")",
          archived: false,
          read: false,
        },
        `${Date.now()}`,
      );
    } catch (error) {
      console.error("Error sending notification:", error);
      setMessage("Error sending test notification.");
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
        Test Notifications
      </h1>

      <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
        Send test notifications at different levels to verify the notification
        system is working correctly.
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Button variant="primary" onClick={() => handleSendNotification("info")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "info" ? 0.5 : 1}}>{isLoading === "info" ? "Sending..." : "Send Info Notification"}</Button>

        <Button variant="success" onClick={() => handleSendNotification("success")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "success" ? 0.5 : 1}}>{isLoading === "success" ? "Sending..." : "Send Success Notification"}</Button>

        <Button variant="warning" onClick={() => handleSendNotification("warning")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "warning" ? 0.5 : 1}}>{isLoading === "warning" ? "Sending..." : "Send Warning Notification"}</Button>

        <Button variant="danger" onClick={() => handleSendNotification("error")} disabled={!!isLoading} style={{opacity: isLoading && isLoading !== "error" ? 0.5 : 1}}>{isLoading === "error" ? "Sending..." : "Send Error Notification"}</Button>
      </div>

      {message && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            borderRadius: "6px",
            background: message.includes("success") ? "#10b98120" : "#ef444420",
            border: `1px solid ${
              message.includes("success") ? "#10b981" : "#ef4444"
            }`,
            color: message.includes("success") ? "#34d399" : "#f87171",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
