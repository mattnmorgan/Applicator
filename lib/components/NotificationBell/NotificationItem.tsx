"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Notification from "@/lib/database/types/notification";
import TableRecord from "@/lib/database/crud/types/record";

interface NotificationItemProps {
  notification: TableRecord<Notification>;
  onMarkRead: (id: string, read: boolean) => void;
  onArchive: (id: string) => void;
}

export default function NotificationItem({
  notification,
  onMarkRead,
  onArchive,
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const getTypeColor = () => {
    switch (notification.data.type) {
      case "error":
        return "#ef4444";
      case "warning":
        return "#fbbf24";
      case "success":
        return "#10b981";
      case "info":
      default:
        return "#3b82f6";
    }
  };

  const getTypeIcon = () => {
    const iconStyle = { width: "24px", height: "24px" };
    switch (notification.data.type) {
      case "error":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={getTypeColor()}
            strokeWidth="2"
            style={iconStyle}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case "warning":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={getTypeColor()}
            strokeWidth="2"
            style={iconStyle}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case "success":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={getTypeColor()}
            strokeWidth="2"
            style={iconStyle}
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case "info":
      default:
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={getTypeColor()}
            strokeWidth="2"
            style={iconStyle}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  const handleClick = () => {
    if (notification.data.url) {
      router.push(notification.data.url);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "12px",
        borderBottom: "1px solid #334155",
        cursor: notification.data.url ? "pointer" : "default",
        background: isHovered ? "#1e293b" : "transparent",
        transition: "background 0.2s",
        position: "relative",
      }}
    >
      {!notification.data.read && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            background: getTypeColor(),
          }}
        />
      )}

      <div
        style={{
          flexShrink: 0,
          marginLeft: notification.data.read ? "0" : "8px",
        }}
      >
        {notification.data.icon ? (
          <img
            src={notification.data.icon}
            alt=""
            style={{ width: "24px", height: "24px" }}
          />
        ) : (
          getTypeIcon()
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {notification.data.title && (
          <div
            style={{
              color: "#f1f5f9",
              fontWeight: 500,
              fontSize: "14px",
              marginBottom: "4px",
            }}
          >
            {notification.data.title}
          </div>
        )}
        <div
          style={{
            color: "#94a3b8",
            fontSize: "13px",
            wordBreak: "break-word",
          }}
        >
          {notification.data.message}
        </div>
        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
          {new Date(Number(notification.data.timestamp)).toLocaleString()}
        </div>
      </div>

      {isHovered && (
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id, !notification.data.read);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
            }}
            title={notification.data.read ? "Mark as unread" : "Mark as read"}
          >
            {notification.data.read ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
            }}
            title="Clear notification"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
