"use client";

import { useState, useEffect } from "react";
import styles from "./AssumeIdentityModal.module.css";
import User from "@/lib/database/types/user";
import TableRecord from "@/lib/database/crud/types/record";
import UserManager from "@/lib/database/client/managers/user";

interface AssumeIdentityModalProps {
  onClose: () => void;
  onAssumeIdentity: (userId: string) => void;
}

export default function AssumeIdentityModal({
  onClose,
  onAssumeIdentity,
}: AssumeIdentityModalProps) {
  const [users, setUsers] = useState<TableRecord<User>[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [assuming, setAssuming] = useState(false);

  const userManager = new UserManager();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userManager.readRecords({});

      for (const user of data.records) {
        if (user.data.icon) {
          user.data.icon = "/api/system/assets/icons/users/" + user.id;
        }
      }

      setUsers(data.records);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssumeIdentity = async () => {
    if (!selectedUserId) return;

    setAssuming(true);
    onAssumeIdentity(selectedUserId);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.data.display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      user.data.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.data.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#f1f5f9" }}>
            Assume User Identity
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <input
            type="text"
            className={styles.searchBox}
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className={styles.userList}>
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px",
                  color: "#94a3b8",
                }}
              >
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px",
                  color: "#94a3b8",
                }}
              >
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`${styles.userItem} ${
                    selectedUserId === user.id ? styles.selected : ""
                  } ${!user.data.is_active ? styles.inactive : ""}`}
                  onClick={() =>
                    user.data.is_active && setSelectedUserId(user.id)
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flex: 1,
                    }}
                  >
                    <div className={styles.avatar}>
                      {user.data.icon ? (
                        <img
                          src={user.data.icon}
                          alt={user.data.display_name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        <span>
                          {user.data.display_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#f1f5f9",
                          fontWeight: "500",
                        }}
                      >
                        {user.data.display_name}
                        {!user.data.is_active && (
                          <span
                            style={{
                              color: "#94a3b8",
                              marginLeft: "8px",
                              fontSize: "12px",
                            }}
                          >
                            (Inactive)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        @{user.data.username} • {user.data.authority_id}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleAssumeIdentity}
            disabled={!selectedUserId || assuming}
            className={styles.confirmButton}
          >
            {assuming ? "Assuming Identity..." : "Assume Identity"}
          </button>
        </div>
      </div>
    </div>
  );
}
