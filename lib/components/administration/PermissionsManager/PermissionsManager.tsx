"use client";

import { useState, useEffect } from "react";
import SearchableCombobox from "../../utility/SearchableCombobox/SearchableCombobox";
import Badge from "../../utility/Badge/Badge";
import ToastStack, { ToastItem } from "../../utility/Toast";
import AuthorityManager from "@/lib/client/managers/authority";
import AuthorizationManager from "@/lib/client/managers/authorization";
import UserManager from "@/lib/client/managers/user";
import AppManager from "@/lib/client/managers/app";
import styles from "./PermissionsManager.module.css";

// ── Row types ────────────────────────────────────────────────────────────────

interface AuthorityRow {
  type: "authority";
  id: string;
  name: string;
  iconUrl?: string;
  appId?: string;
  appLabel?: string;
  /** True for app-specific authorities — their permissions are system-managed */
  isAppSpecific: boolean;
  authorizations: string[];
}

interface UserRow {
  type: "user";
  id: string;
  displayName: string;
  username: string;
  iconUrl?: string;
  authorityId: string;
  authorityName: string;
  /** Authorizations from the user's base authority (inherited) */
  authorityAuthorizations: string[];
  /** Authorizations from the user-specific authority (direct) */
  userSpecificAuthorizations: string[];
  /** Preserved apps for upsert — don't lose existing user-specific app grants */
  userSpecificApps: string[];
}

type Row = AuthorityRow | UserRow;

// ── Column type ──────────────────────────────────────────────────────────────

interface AuthorizationColumn {
  id: string;
  name: string;
  appId: string;
  appLabel: string;
}

// ── Filter item types ────────────────────────────────────────────────────────

interface UserFilterItem {
  id: string;
  displayName: string;
  username: string;
}

interface AuthorityFilterItem {
  id: string;
  name: string;
  appId?: string;
  appLabel?: string;
}

interface PermissionFilterItem {
  id: string;
  name: string;
  appId: string;
  appLabel: string;
}

// ── Cell access state ────────────────────────────────────────────────────────

type CellState = "direct" | "inherited" | "app-managed" | "none";

function getCellState(row: Row, authId: string): CellState {
  if (row.type === "authority") {
    if (row.isAppSpecific) return row.authorizations.includes(authId) ? "app-managed" : "none";
    return row.authorizations.includes(authId) ? "direct" : "none";
  }
  if (row.userSpecificAuthorizations.includes(authId)) return "direct";
  if (row.authorityAuthorizations.includes(authId)) return "inherited";
  return "none";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PermissionsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<AuthorizationColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [userFilterItems, setUserFilterItems] = useState<UserFilterItem[]>([]);
  const [authorityFilterItems, setAuthorityFilterItems] = useState<AuthorityFilterItem[]>([]);
  const [permissionFilterItems, setPermissionFilterItems] = useState<PermissionFilterItem[]>([]);

  const [selectedUsers, setSelectedUsers] = useState<UserFilterItem[]>([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState<AuthorityFilterItem[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionFilterItem[]>([]);

  const addToast = (toast: ToastItem) => setToasts((prev) => [...prev, toast]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authorityManager = new AuthorityManager();
      const authorizationManager = new AuthorizationManager();
      const userManager = new UserManager();
      const appManager = new AppManager();

      const [authorityData, authorizationData, userData, appData] = await Promise.all([
        authorityManager.readRecords({}),
        authorizationManager.readRecords({}),
        userManager.readRecords({}),
        appManager.readRecords({}),
      ]);

      // App label lookup
      const appLabelMap: Record<string, string> = {};
      for (const app of appData.records) {
        appLabelMap[app.id] = app.data.label;
      }

      // Authority lookup (all, including user-specific)
      const authorityLookup: Record<string, {
        name: string;
        authorizations: string[];
        apps: string[];
        appId?: string;
      }> = {};
      for (const record of authorityData.records) {
        authorityLookup[record.id] = {
          name: record.data.name,
          authorizations: record.data.authorizations || [],
          apps: record.data.apps || [],
          appId: record.data.app,
        };
      }

      // Authorization columns — skip contextual (per-item) permissions
      const authColumns: AuthorizationColumn[] = authorizationData.records
        .filter((r) => !r.data.contextual && r.data.target !== "app")
        .map((r) => ({
          id: r.id,
          name: r.data.name,
          appId: r.data.app,
          appLabel: appLabelMap[r.data.app] || r.data.app,
        }));
      authColumns.sort((a, b) => a.name.localeCompare(b.name));

      // Authority rows — skip user-specific and contextual authorities
      const authorityRows: AuthorityRow[] = [];
      for (const record of authorityData.records) {
        if (record.id.startsWith("user-specific:")) continue;
        if (record.data.contextual) continue;

        const isAppSpecific = record.id.startsWith("app-specific:");
        const appLabel = record.data.app ? appLabelMap[record.data.app] : undefined;

        authorityRows.push({
          type: "authority",
          id: record.id,
          name: record.data.name,
          iconUrl:
            record.data.icon && record.data.icon.trim() !== ""
              ? `/api/system/assets/icons/authorities/${record.id}?t=${Date.now()}`
              : undefined,
          appId: record.data.app,
          appLabel,
          isAppSpecific,
          authorizations: record.data.authorizations || [],
        });
      }
      authorityRows.sort((a, b) => a.name.localeCompare(b.name));

      // User rows
      const userRows: UserRow[] = [];
      for (const record of userData.records) {
        const user = record.data;
        const baseAuth = authorityLookup[user.authority_id];
        const userSpecificAuth = authorityLookup[`user-specific:${record.id}`];

        userRows.push({
          type: "user",
          id: record.id,
          displayName: user.display_name,
          username: user.username,
          iconUrl:
            user.icon && user.icon.trim() !== ""
              ? `/api/system/assets/icons/users/${record.id}?t=${Date.now()}`
              : undefined,
          authorityId: user.authority_id,
          authorityName: baseAuth?.name ?? user.authority_id,
          authorityAuthorizations: baseAuth?.authorizations ?? [],
          userSpecificAuthorizations: userSpecificAuth?.authorizations ?? [],
          userSpecificApps: userSpecificAuth?.apps ?? [],
        });
      }
      userRows.sort((a, b) => a.displayName.localeCompare(b.displayName));

      setUserFilterItems(
        userRows.map((r) => ({ id: r.id, displayName: r.displayName, username: r.username })),
      );
      setAuthorityFilterItems(
        authorityRows.map((r) => ({ id: r.id, name: r.name, appId: r.appId, appLabel: r.appLabel })),
      );
      setPermissionFilterItems(
        authColumns.map((c) => ({ id: c.id, name: c.name, appId: c.appId, appLabel: c.appLabel })),
      );

      setRows([...authorityRows, ...userRows]);
      setColumns(authColumns);
    } catch (error) {
      console.error("Failed to fetch permissions data:", error);
      addToast({ message: "Failed to load permissions data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (row: Row, authId: string, checked: boolean) => {
    const authorityManager = new AuthorityManager();

    if (row.type === "authority") {
      const newAuthorizations = checked
        ? [...new Set([...row.authorizations, authId])]
        : row.authorizations.filter((id) => id !== authId);

      try {
        await authorityManager.updateRecord(row.id, { authorizations: newAuthorizations }, true);
        setRows((prev) =>
          prev.map((r) => {
            if (r.type === "authority" && r.id === row.id)
              return { ...r, authorizations: newAuthorizations };
            if (r.type === "user" && r.authorityId === row.id)
              return { ...r, authorityAuthorizations: newAuthorizations };
            return r;
          }),
        );
      } catch {
        addToast({ message: "Failed to update authority permissions", type: "error" });
      }
    } else {
      const newUserSpecificAuthorizations = checked
        ? [...new Set([...row.userSpecificAuthorizations, authId])]
        : row.userSpecificAuthorizations.filter((id) => id !== authId);

      try {
        await authorityManager.upsertRecord(`user-specific:${row.id}`, {
          name: `User-specific: ${row.displayName}`,
          authorizations: newUserSpecificAuthorizations,
          apps: row.userSpecificApps,
          user_id: row.id,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.type === "user" && r.id === row.id
              ? { ...r, userSpecificAuthorizations: newUserSpecificAuthorizations }
              : r,
          ),
        );
      } catch {
        addToast({ message: "Failed to update user permissions", type: "error" });
      }
    }
  };

  const handleAppManagedClick = (appLabel: string) => {
    addToast({
      message: `Permissions for this authority are managed by the ${appLabel} app.`,
      type: "error",
    });
  };

  const handleInheritedClick = (authorityName: string) => {
    addToast({
      message: `Permission is inherited from "${authorityName}". Edit that authority to remove it.`,
      type: "error",
    });
  };

  // ── Filtered rows & columns ────────────────────────────────────────────────

  const filteredRows = rows.filter((row) => {
    if (row.type === "authority")
      return selectedAuthorities.length === 0 || selectedAuthorities.some((f) => f.id === row.id);
    return selectedUsers.length === 0 || selectedUsers.some((f) => f.id === row.id);
  });

  const filteredColumns =
    selectedPermissions.length === 0
      ? columns
      : columns.filter((c) => selectedPermissions.some((f) => f.id === c.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className={styles.loadingState}>Loading permissions data…</div>;
  }

  return (
    <div className={styles.container}>
      <ToastStack
        toasts={toasts}
        onClose={(i) => setToasts((prev) => prev.filter((_, idx) => idx !== i))}
      />

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Users</span>
          <SearchableCombobox<UserFilterItem>
            items={userFilterItems}
            renderItem={(item, context) =>
              context === "pill" ? (
                <span>
                  {item.username}
                  <span className={styles.pillSeparator}>·</span>
                  {item.displayName}
                </span>
              ) : (
                <div className={styles.dropdownItem}>
                  <span className={styles.dropdownPrimary}>{item.displayName}</span>
                  <span className={styles.dropdownSecondary}>{item.username}</span>
                </div>
              )
            }
            filterItem={(item, term) =>
              item.username.toLowerCase().includes(term.toLowerCase()) ||
              item.displayName.toLowerCase().includes(term.toLowerCase())
            }
            selectedItems={selectedUsers}
            onSelectionChange={setSelectedUsers}
            getItemKey={(item) => item.id}
            multiSelect
            placeholder="Filter users…"
          />
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Authorities</span>
          <SearchableCombobox<AuthorityFilterItem>
            items={authorityFilterItems}
            renderItem={(item, context) =>
              context === "pill" ? (
                <span className={styles.pillContent}>
                  {item.name}
                  {item.appLabel && (
                    <>
                      <span className={styles.pillSeparator}>·</span>
                      <Badge variant={item.appId === "system" ? "purple" : "blue"}>
                        {item.appLabel}
                      </Badge>
                    </>
                  )}
                </span>
              ) : (
                <div className={styles.dropdownItem}>
                  <span className={styles.dropdownPrimary}>{item.name}</span>
                  {item.appLabel && (
                    <Badge variant={item.appId === "system" ? "purple" : "blue"}>
                      {item.appLabel}
                    </Badge>
                  )}
                </div>
              )
            }
            filterItem={(item, term) => item.name.toLowerCase().includes(term.toLowerCase())}
            selectedItems={selectedAuthorities}
            onSelectionChange={setSelectedAuthorities}
            getItemKey={(item) => item.id}
            multiSelect
            placeholder="Filter authorities…"
          />
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Permissions</span>
          <SearchableCombobox<PermissionFilterItem>
            items={permissionFilterItems}
            renderItem={(item, context) =>
              context === "pill" ? (
                <span className={styles.pillContent}>
                  {item.name}
                  <span className={styles.pillSeparator}>·</span>
                  <Badge variant={item.appId === "system" ? "purple" : "blue"}>
                    {item.appLabel}
                  </Badge>
                </span>
              ) : (
                <div className={styles.dropdownItem}>
                  <span className={styles.dropdownPrimary}>{item.name}</span>
                  <Badge variant={item.appId === "system" ? "purple" : "blue"}>
                    {item.appLabel}
                  </Badge>
                </div>
              )
            }
            filterItem={(item, term) =>
              item.name.toLowerCase().includes(term.toLowerCase()) ||
              item.appLabel.toLowerCase().includes(term.toLowerCase())
            }
            selectedItems={selectedPermissions}
            onSelectionChange={setSelectedPermissions}
            getItemKey={(item) => item.id}
            multiSelect
            placeholder="Filter permissions…"
          />
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDirect} />
          Direct grant
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendInherited} />
          Inherited from authority (read‑only on user rows)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendAppManaged} />
          Managed by app install (read‑only)
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {filteredColumns.length === 0 ? (
          <div className={styles.emptyState}>No permissions match the current filter.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.headerCell} ${styles.cornerCell}`}>
                  <span className={styles.cornerLabel}>Users &amp; Authorities</span>
                </th>
                {filteredColumns.map((col) => (
                  <th key={col.id} className={styles.headerCell}>
                    <div className={styles.columnHeader}>
                      <span className={styles.columnLabel}>{col.name}</span>
                      <Badge variant={col.appId === "system" ? "purple" : "blue"}>
                        {col.appLabel}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={filteredColumns.length + 1} className={styles.emptyCell}>
                    No rows match the current filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className={styles.dataRow}>
                    {/* Sticky row header */}
                    <td
                      className={`${styles.rowHeader} ${
                        row.type === "user" ? styles.userRowHeader : styles.authorityRowHeader
                      }`}
                    >
                      {row.type === "authority" ? (
                        <div className={styles.rowHeaderContent}>
                          {row.iconUrl ? (
                            <img src={row.iconUrl} alt={row.name} className={styles.rowIcon} />
                          ) : (
                            <div className={styles.rowIconPlaceholder}>
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={styles.rowHeaderText}>
                            <span className={styles.rowPrimary}>{row.name}</span>
                            {row.appLabel && (
                              <Badge variant={row.appId === "system" ? "purple" : "blue"}>
                                {row.appLabel}
                              </Badge>
                            )}
                          </div>
                          {row.isAppSpecific && (
                            <Badge variant="yellow">App</Badge>
                          )}
                        </div>
                      ) : (
                        <div className={styles.rowHeaderContent}>
                          {row.iconUrl ? (
                            <img
                              src={row.iconUrl}
                              alt={row.displayName}
                              className={styles.rowIcon}
                            />
                          ) : (
                            <div className={styles.rowIconPlaceholder}>
                              {row.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={styles.rowHeaderText}>
                            <span className={styles.rowPrimary}>{row.displayName}</span>
                            <span className={styles.rowSecondary}>{row.username}</span>
                          </div>
                          <Badge variant="blue">{row.authorityName}</Badge>
                        </div>
                      )}
                    </td>

                    {/* Data cells */}
                    {filteredColumns.map((col) => {
                      const state = getCellState(row, col.id);
                      const isReadOnly = state === "inherited" || state === "app-managed";

                      return (
                        <td
                          key={col.id}
                          className={`${styles.dataCell} ${
                            state === "inherited"
                              ? styles.inheritedCell
                              : state === "app-managed"
                              ? styles.appManagedCell
                              : ""
                          }`}
                        >
                          <div
                            className={styles.cellContainer}
                            onClick={
                              state === "inherited"
                                ? () => handleInheritedClick((row as UserRow).authorityName)
                                : state === "app-managed"
                                ? () =>
                                    handleAppManagedClick(
                                      (row as AuthorityRow).appLabel ?? "the app",
                                    )
                                : undefined
                            }
                            style={isReadOnly ? { cursor: "help" } : undefined}
                          >
                            <input
                              type="checkbox"
                              className={`${styles.checkbox} ${
                                isReadOnly ? styles.readOnlyCheckbox : ""
                              }`}
                              checked={state !== "none"}
                              disabled={isReadOnly}
                              onChange={
                                !isReadOnly
                                  ? (e) => handleToggle(row, col.id, e.target.checked)
                                  : undefined
                              }
                              title={
                                state === "inherited"
                                  ? `Inherited from "${(row as UserRow).authorityName}"`
                                  : state === "app-managed"
                                  ? `Managed by ${(row as AuthorityRow).appLabel ?? "the app"}`
                                  : undefined
                              }
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
