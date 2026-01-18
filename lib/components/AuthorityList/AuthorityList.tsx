"use client";

import { useState, useEffect } from "react";
import ButtonMenu from "../ButtonMenu";
import Row from "../Row";
import Toast from "../Toast";
import AuthorityCreate from "../AuthorityCreate";
import Badge from "../Badge/Badge";
import styles from "./AuthorityList.module.css";
import AuthorityManager from "@/lib/database/client/managers/authority";
import UserManager from "@/lib/database/client/managers/user";
import AppManager from "@/lib/database/client/managers/app";

interface Authority {
  id: string;
  name: string;
  icon?: string;
  authorizations?: string[];
  apps?: string[];
  contextual?: boolean;
  app?: string;
  appLabel?: string;
  isAppSpecific?: boolean;
}

export default function AuthorityList() {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [selectedAuthorityIds, setSelectedAuthorityIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateAuthority, setShowCreateAuthority] = useState(false);
  const [editingAuthority, setEditingAuthority] = useState<Authority | null>(
    null
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const authorityManager = new AuthorityManager();
  const userManager = new UserManager();
  const appManager = new AppManager();

  const fetchAuthorities = async () => {
    try {
      const data = await authorityManager.readRecords({});

      // Filter out user-specific authorities and enrich with icon URLs and app labels
      const allAuthorities = data.records;

      const nonUserAuthorities = allAuthorities.filter((record) => {
        return record && record.data && !record.data.userId;
      });

      // Fetch all apps for contextual authorities
      const appsData = await appManager.readRecords({});
      const appIdToLabel = new Map<string, string>();
      for (const appRecord of appsData.records) {
        appIdToLabel.set(appRecord.id, appRecord.data.label);
      }

      // Transform records to match expected format and add icon URLs
      const authoritiesWithIcons = nonUserAuthorities.map((record) => {
        const authority = record.data;
        const isAppSpecific = record.id.startsWith("app-specific:");
        let appLabel = undefined;

        if ((authority.contextual || isAppSpecific) && authority.app) {
          appLabel = appIdToLabel.get(authority.app) || "Unknown";
        }

        return {
          id: record.id,
          name: authority.name,
          icon:
            authority.icon && authority.icon.trim() !== ""
              ? `/api/system/assets/icons/authorities/${
                  record.id
                }?t=${Date.now()}`
              : undefined,
          authorizations: authority.authorizations,
          apps: authority.apps,
          contextual: authority.contextual,
          app: authority.app,
          appLabel,
          isAppSpecific,
        };
      });

      // Sort authorities alphabetically by name
      authoritiesWithIcons.sort((a, b) => a.name.localeCompare(b.name));

      setAuthorities(authoritiesWithIcons);
    } catch (error) {
      console.error("Failed to fetch authorities:", error);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const handleSelectAuthority = (authorityId: string, checked: boolean) => {
    const newSelection = new Set(selectedAuthorityIds);
    if (checked) {
      newSelection.add(authorityId);
    } else {
      newSelection.delete(authorityId);
    }
    setSelectedAuthorityIds(newSelection);
  };

  const handleDelete = async () => {
    if (selectedAuthorityIds.size === 0) return;

    setLoading(true);
    try {
      const authorityIdsArray = Array.from(selectedAuthorityIds);

      // Check for system authorities
      const systemAuthorities = ["system:admin", "system:user", "system:guest"];
      const systemAuthorityAttempts = authorityIdsArray.filter((id) =>
        systemAuthorities.includes(id)
      );

      if (systemAuthorityAttempts.length > 0) {
        setToast({
          message:
            "Cannot delete system authorities (Administrator, User, or Guest)",
          type: "error",
        });
        setLoading(false);
        return;
      }

      // Check for authorities with assigned users
      const violatedAuthorities: string[] = [];
      for (const authorityId of authorityIdsArray) {
        try {
          const checkData = await userManager.readRecords({
            fields: { authority: authorityId },
            limit: 1,
          });
          if (checkData.records.length > 0) {
            violatedAuthorities.push(authorityId);
          }
        } catch {
          // Skip if check fails
        }
      }

      if (violatedAuthorities.length > 0) {
        const violatedNames = violatedAuthorities
          .map((id: string) => {
            const auth = authorities.find((a) => a.id === id);
            return auth?.name || id;
          })
          .join(", ");
        setToast({
          message: `Cannot delete authorities with assigned users: ${violatedNames}`,
          type: "error",
        });
        setLoading(false);
        return;
      }

      // Delete authorities
      await authorityManager.deleteRecords(authorityIdsArray);

      setToast({
        message: `Successfully deleted ${authorityIdsArray.length} ${
          authorityIdsArray.length === 1 ? "authority" : "authorities"
        }`,
        type: "success",
      });
      await fetchAuthorities();
      setSelectedAuthorityIds(new Set());
    } catch (error) {
      setToast({ message: "Failed to delete authorities", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filteredAuthorities = authorities.filter((authority) =>
    authority.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const someSelected = selectedAuthorityIds.size > 0;

  const handleAuthorityCreated = async () => {
    await fetchAuthorities();
    setShowCreateAuthority(false);
    setEditingAuthority(null);
  };

  const handleEditAuthority = async (authorityId: string) => {
    const authority = authorities.find((a) => a.id === authorityId);
    // Prevent editing contextual authorities (but allow app-specific)
    if (authority?.contextual && !authority?.isAppSpecific) {
      setToast({
        message: "Contextual authorities cannot be edited",
        type: "error",
      });
      return;
    }

    try {
      const data = await authorityManager.readRecords({ ids: [authorityId] });
      if (data.records && data.records.length > 0) {
        const record = data.records[0];
        const authorityData = record.data;
        const isAppSpecific = record.id.startsWith("app-specific:");
        setEditingAuthority({
          id: record.id,
          name: authorityData.name,
          icon:
            authorityData.icon && authorityData.icon.trim() !== ""
              ? `/api/system/assets/icons/authorities/${
                  record.id
                }?t=${Date.now()}`
              : undefined,
          authorizations: authorityData.authorizations,
          apps: authorityData.apps,
          isAppSpecific,
          app: authorityData.app,
        });
      }
    } catch (error) {
      console.error("Failed to fetch authority:", error);
      setToast({
        message: "Failed to load authority for editing",
        type: "error",
      });
    }
  };

  if (showCreateAuthority || editingAuthority) {
    return (
      <AuthorityCreate
        onCancel={() => {
          setShowCreateAuthority(false);
          setEditingAuthority(null);
        }}
        onAuthorityCreated={handleAuthorityCreated}
        editAuthority={
          editingAuthority
            ? {
                id: editingAuthority.id,
                name: editingAuthority.name,
                icon: editingAuthority.icon,
                authorizations: editingAuthority.authorizations,
                apps: editingAuthority.apps,
                isAppSpecific: editingAuthority.isAppSpecific,
                appId: editingAuthority.app,
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className={styles.container}>
      {toast && (
        <div className={styles.toastContainer}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className={styles.toolbar}>
        <button
          className={styles.addButton}
          onClick={() => setShowCreateAuthority(true)}
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
          <div className={styles.menuItem} onClick={handleDelete}>
            Delete
          </div>
        </ButtonMenu>

        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search authorities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.authorityList}>
        {filteredAuthorities.map((authority) => (
          <Row key={authority.id}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selectedAuthorityIds.has(authority.id)}
              onChange={(e) =>
                handleSelectAuthority(authority.id, e.target.checked)
              }
              disabled={authority.contextual || authority.isAppSpecific}
              style={{
                opacity: authority.contextual || authority.isAppSpecific ? 0.5 : 1,
                cursor: authority.contextual || authority.isAppSpecific ? "not-allowed" : "pointer",
              }}
            />
            <div
              className={styles.authorityInfo}
              onClick={() => handleEditAuthority(authority.id)}
              style={{
                cursor: authority.contextual && !authority.isAppSpecific ? "not-allowed" : "pointer",
              }}
            >
              {authority.icon ? (
                <div className={styles.iconPlaceholder}>
                  <img
                    src={authority.icon}
                    alt={authority.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              ) : (
                <div className={styles.iconPlaceholder}>
                  {authority.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.nameColumn}>
                <div className={styles.authorityName}>{authority.name}</div>
              </div>
            </div>
            <div className={styles.badgeColumn}>
              {authority.isAppSpecific && (
                <Badge variant="green">App</Badge>
              )}
              {authority.contextual && !authority.isAppSpecific && (
                <Badge variant="yellow">Contextual</Badge>
              )}
              {authority.appLabel && (
                <Badge variant={authority.app === "system" ? "purple" : "blue"}>
                  {authority.appLabel}
                </Badge>
              )}
            </div>
          </Row>
        ))}

        {filteredAuthorities.length === 0 && (
          <div className={styles.emptyState}>No authorities found</div>
        )}
      </div>
    </div>
  );
}
