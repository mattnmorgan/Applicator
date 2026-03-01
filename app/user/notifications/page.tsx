"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Notification from "@/lib/database/types/notification";
import TableRecord from "@/lib/database/crud/types/record";
import NotificationManager from "@/lib/client/managers/notification";
import Button from "@/lib/components/utility/Button";
import ButtonIcon from "@/lib/components/utility/ButtonIcon";
import Icon from "@/lib/components/utility/Icon";
import DynamicInput from "@/lib/components/utility/DynamicInput";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<
    TableRecord<Notification>[]
  >([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    TableRecord<Notification>[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "archived">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const notificationManager = new NotificationManager();

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const result = await notificationManager.readRecords({});
      setNotifications(
        result.records.sort(
          (a: TableRecord<Notification>, b: TableRecord<Notification>) =>
            b.created_at - a.created_at,
        ),
      );
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    let filtered = notifications;

    if (filterType === "unread") {
      filtered = filtered.filter((n) => !n.data.read && !n.data.archived);
    } else if (filterType === "archived") {
      filtered = filtered.filter((n) => n.data.archived);
    } else {
      filtered = filtered.filter((n) => !n.data.archived);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.data.title?.toLowerCase().includes(query) ||
          n.data.message.toLowerCase().includes(query) ||
          n.data.app.toLowerCase().includes(query) ||
          new Date(Number(n.data.timestamp) || n.created_at)
            .toLocaleString()
            .toLowerCase()
            .includes(query),
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchQuery, filterType]);

  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      await notificationManager.updateRecord(id, { read });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification:", error);
    }
  };

  const handleArchive = async (id: string, archived: boolean) => {
    try {
      if (!archived) {
        await notificationManager.updateRecord(id, { archived: true });
      } else {
        await notificationManager.deleteRecord(id);
      }
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to archive notification:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
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

  const getTypeIcon = (notification: Notification) => {
    const iconStyle = { width: "24px", height: "24px" };
    const color = getTypeColor(notification.type);

    switch (notification.type) {
      case "error":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
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
            stroke={color}
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
            stroke={color}
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
            stroke={color}
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            style={{ marginBottom: "16px" }}
          >
            <Icon name="chevron-left" size={16} />
            Back
          </Button>

          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#f1f5f9",
              margin: "0 0 24px 0",
            }}
          >
            Notifications
          </h1>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <DynamicInput
                input={{
                  id: "search",
                  type: "text",
                  label: "Search",
                  placeholder: "Search notifications...",
                }}
                value={searchQuery}
                onChange={(_, val) => setSearchQuery(val)}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant={filterType === "all" ? "primary" : "secondary"}
                onClick={() => setFilterType("all")}
              >
                All
              </Button>
              <Button
                variant={filterType === "unread" ? "primary" : "secondary"}
                onClick={() => setFilterType("unread")}
              >
                Unread
              </Button>
              <Button
                variant={filterType === "archived" ? "primary" : "secondary"}
                onClick={() => setFilterType("archived")}
              >
                Archived
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px",
              color: "#94a3b8",
            }}
          >
            Loading...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px",
              color: "#94a3b8",
            }}
          >
            No notifications found
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => {
                  if (notification.data.url) {
                    router.push(notification.data.url);
                  }
                }}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "20px",
                  cursor: notification.data.url ? "pointer" : "default",
                  transition: "all 0.2s",
                  position: "relative",
                  display: "flex",
                  gap: "16px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#334155";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#1e293b";
                }}
              >
                {!notification.data.read && !notification.data.archived && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "4px",
                      background: getTypeColor(notification.data.type),
                      borderTopLeftRadius: "8px",
                      borderBottomLeftRadius: "8px",
                    }}
                  />
                )}

                <div
                  style={{
                    flexShrink: 0,
                    marginLeft:
                      notification.data.read || notification.data.archived
                        ? "0"
                        : "8px",
                  }}
                >
                  {notification.data.icon ? (
                    <img
                      src={notification.data.icon}
                      alt=""
                      style={{ width: "24px", height: "24px" }}
                    />
                  ) : (
                    getTypeIcon(notification.data)
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {notification.data.title && (
                        <div
                          style={{
                            color: "#f1f5f9",
                            fontWeight: 600,
                            fontSize: "16px",
                            marginBottom: "8px",
                          }}
                        >
                          {notification.data.title}
                        </div>
                      )}
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "14px",
                          marginBottom: "8px",
                          wordBreak: "break-word",
                        }}
                      >
                        {notification.data.message}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        <span>{notification.data.app}</span>
                        <span>
                          {new Date(
                            Number(notification.data.timestamp) ||
                              notification.created_at,
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", gap: "8px", flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!notification.data.archived && (
                        <ButtonIcon
                          name={notification.data.read ? "eye" : "eye-off"}
                          label={notification.data.read ? "Mark as unread" : "Mark as read"}
                          onClick={() =>
                            handleMarkRead(
                              notification.id,
                              !notification.data.read,
                            )
                          }
                        />
                      )}
                      <ButtonIcon
                        name="trash"
                        label={notification.data.archived ? "Delete notification" : "Archive notification"}
                        onClick={() =>
                          handleArchive(
                            notification.id,
                            notification.data.archived,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
