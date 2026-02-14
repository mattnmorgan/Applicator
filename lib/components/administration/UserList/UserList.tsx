"use client";

import { useState, useEffect } from "react";
import ProfileIndicator from "../../utility/ProfileIndicator";
import ButtonMenu from "../../utility/ButtonMenu";
import Row from "../../utility/Row";
import UserCreate from "../UserCreate";
import Badge from "../../utility/Badge/Badge";
import styles from "./UserList.module.css";
import UserManager from "@/lib/client/managers/user";
import AuthorityManager from "@/lib/client/managers/authority";

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  isActive: boolean;
  icon?: string; // File path stored in database
  profilePicture?: string; // API URL for display
  authority: string;
  authorityName: string;
  allAuthorizations: {
    authorizations: string[];
    userAuthorizations: string[];
  };
  allAppAccess: {
    accesses: string[];
    userAccesses: string[];
  };
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const userManager = new UserManager();
  const authorityManager = new AuthorityManager();

  const fetchUsers = async () => {
    try {
      const [usersData, authoritiesData] = await Promise.all([
        userManager.readRecords({}),
        authorityManager.readRecords({}),
      ]);

      // Create authority ID to name mapping
      const authorityIdToName = new Map<string, string>();
      for (const record of authoritiesData.records) {
        authorityIdToName.set(record.id, record.data.name);
      }

      // Transform user records to expected format
      const usersList = usersData.records.map((record) => ({
        id: record.id,
        username: record.data.username,
        email: record.data.email,
        displayName: record.data.display_name,
        authority: record.data.authority_id,
        authorityName:
          authorityIdToName.get(record.data.authority_id) || "Unknown",
        isActive: record.data.is_active,
        icon:
          record.data.icon && record.data.icon.trim() !== ""
            ? `/api/system/assets/icons/users/${record.id}?t=${Date.now()}`
            : undefined,
        allAuthorizations: {
          authorizations: [],
          userAuthorizations: [],
        },
        allAppAccess: {
          accesses: [],
          userAccesses: [],
        },
      }));

      setUsers(usersList);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUserIds);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleUpdateStatus = async (isActive: boolean) => {
    if (selectedUserIds.size === 0) return;

    setLoading(true);
    try {
      const updates = Array.from(selectedUserIds).reduce(
        (acc, id) => {
          acc[id] = { is_active: isActive };
          return acc;
        },
        {} as Record<string, { is_active: boolean }>,
      );

      await userManager.updateRecords(updates);
      await fetchUsers();
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error("Failed to update user status:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const allSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.has(u.id));
  const someSelected = selectedUserIds.size > 0;

  const handleUserCreated = async () => {
    await fetchUsers();
    setShowCreateUser(false);
    setEditingUser(null);
  };

  const handleEditUser = async (userId: string) => {
    try {
      // Fetch user data
      const userData = await userManager.readRecords({ ids: [userId] });

      if (!userData.records || userData.records.length === 0) {
        console.error("User not found");
        return;
      }

      const userRecord = userData.records[0];

      // Fetch main authority data
      const mainAuthorityData = await authorityManager.readRecords({
        ids: [userRecord.data.authority_id],
      });
      const mainAuthority = mainAuthorityData.records?.[0];

      // Fetch user-specific authority data
      const userAuthorityData = await authorityManager.readRecords({
        ids: [`user-specific:${userId}`],
      });
      const userAuthority = userAuthorityData.records?.[0];

      setEditingUser({
        id: userRecord.id,
        username: userRecord.data.username,
        email: userRecord.data.email,
        displayName: userRecord.data.display_name,
        authority: userRecord.data.authority_id,
        isActive: userRecord.data.is_active,
        icon: userRecord.data.icon, // Preserve the actual file path
        authorityName: mainAuthority?.data.name || "Unknown",
        allAuthorizations: {
          authorizations: mainAuthority?.data.authorizations || [],
          userAuthorizations: userAuthority?.data.authorizations || [],
        },
        allAppAccess: {
          accesses: mainAuthority?.data.apps || [],
          userAccesses: userAuthority?.data.apps || [],
        },
      });
    } catch (error) {
      console.error("Failed to fetch user details:", error);
    }
  };

  if (showCreateUser || editingUser) {
    return (
      <UserCreate
        onCancel={() => {
          setShowCreateUser(false);
          setEditingUser(null);
        }}
        onUserCreated={handleUserCreated}
        editUser={
          editingUser
            ? {
                id: editingUser.id,
                displayName: editingUser.displayName,
                username: editingUser.username,
                email: editingUser.email,
                authority: editingUser.authority,
                icon: editingUser.icon,
                authorizations: editingUser.allAuthorizations,
                apps: editingUser.allAppAccess,
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          className={styles.addButton}
          onClick={() => setShowCreateUser(true)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <ButtonMenu
          disabled={!someSelected}
          alignment="left"
          trigger={
            <button
              className={`${styles.actionButton} ${
                !someSelected ? styles.actionButtonDisabled : ""
              }`}
            >
              <span>Actions</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{ transition: "transform 0.2s" }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          }
        >
          <div
            className={styles.menuItem}
            onClick={() => handleUpdateStatus(true)}
          >
            Activate
          </div>
          <div
            className={styles.menuItem}
            onClick={() => handleUpdateStatus(false)}
          >
            Deactivate
          </div>
        </ButtonMenu>

        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search by name or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.userList}>
        {filteredUsers.map((user) => (
          <Row key={user.id}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selectedUserIds.has(user.id)}
              onChange={(e) => handleSelectUser(user.id, e.target.checked)}
            />
            <div
              className={styles.userInfo}
              onClick={() => handleEditUser(user.id)}
              style={{ cursor: "pointer" }}
            >
              <ProfileIndicator
                displayName={user.displayName}
                profilePicture={user.icon}
              />
            </div>
            <div className={styles.statusColumn}>
              <Badge variant="gray">{user.authorityName}</Badge>
              <Badge variant={user.isActive ? "green" : "red"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </Row>
        ))}

        {filteredUsers.length === 0 && (
          <div className={styles.emptyState}>No users found</div>
        )}
      </div>
    </div>
  );
}
