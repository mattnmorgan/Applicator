"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Notification from "@/lib/database/types/notification";
import NotificationItem from "./NotificationItem";
import TableRecord from "@/lib/database/crud/types/record";
import NotificationManager from "@/lib/client/managers/notification";
import Button from "@/lib/components/utility/Button";
import ButtonIcon from "@/lib/components/utility/ButtonIcon";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    TableRecord<Notification>[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const notificationManager = new NotificationManager();

  const fetchNotifications = async () => {
    try {
      const result = await notificationManager.readRecords({
        fields: { archived: false },
      });
      setNotifications(result.records);
      setUnreadCount(
        result.records.filter((r: TableRecord<Notification>) => !r.data.read)
          .length,
      );
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.data.read);

    if (!unreadNotifications.length) {
      return;
    }

    try {
      const updates = unreadNotifications.reduce(
        (acc, n) => {
          acc[n.id] = { read: true };
          return acc;
        },
        {} as Record<string, Partial<Notification>>,
      );

      await notificationManager.updateRecords(updates);
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleClearAll = async () => {
    if (!notifications.length) {
      return;
    }

    try {
      const updates = notifications.reduce(
        (acc, n) => {
          acc[n.id] = { read: true, archived: true };
          return acc;
        },
        {} as Record<string, Partial<Notification>>,
      );

      await notificationManager.updateRecords(updates);
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to clear all:", error);
    }
  };

  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      await notificationManager.updateRecord(id, { read });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notification:", error);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await notificationManager.updateRecord(id, { archived: true });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to archive notification:", error);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        popover="Notifications"
        style={{ position: "relative" }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "#fff",
              borderRadius: "10px",
              minWidth: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: "bold",
              padding: "0 4px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </Button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            width: "400px",
            maxHeight: "500px",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#f1f5f9",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              Notifications
            </h3>
            <div style={{ display: "flex", gap: "4px" }}>
              <ButtonIcon
                name="check"
                label="Mark all as read"
                onClick={handleMarkAllRead}
                iconSize={18}
              />
              <ButtonIcon
                name="trash"
                label="Clear all notifications"
                onClick={handleClearAll}
                iconSize={18}
              />
              <ButtonIcon
                name="external-link"
                label="View all notifications"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/user/notifications");
                }}
                iconSize={18}
              />
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
