"use client";

import { useState, useEffect } from "react";
import SearchableCombobox from "../../utility/SearchableCombobox/SearchableCombobox";
import Badge from "../../utility/Badge/Badge";
import ToastStack, { ToastItem } from "../../utility/Toast";
import AuthorityManager from "@/lib/client/managers/authority";
import UserManager from "@/lib/client/managers/user";
import AppletManager from "@/lib/client/managers/applet";
import AppManager from "@/lib/client/managers/app";
import styles from "./AppAccessManager.module.css";

// ── Row types ────────────────────────────────────────────────────────────────

interface AuthorityRow {
  type: "authority";
  id: string;
  name: string;
  iconUrl?: string;
  appId?: string;
  appLabel?: string;
  apps: string[];
}

interface UserRow {
  type: "user";
  id: string;
  displayName: string;
  username: string;
  iconUrl?: string;
  authorityId: string;
  authorityName: string;
  /** Apps from the user's base authority (inherited) */
  authorityApps: string[];
  /** Apps from the user-specific authority override (direct) */
  userSpecificApps: string[];
  /** Preserved for upsert — don't lose existing user-specific authorizations */
  userSpecificAuthorizations: string[];
}

type Row = AuthorityRow | UserRow;

// ── Column type ──────────────────────────────────────────────────────────────

interface AppletColumn {
  id: string;
  label: string;
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

interface AppletFilterItem {
  id: string;
  label: string;
  appId: string;
  appLabel: string;
}

// ── Cell access state ────────────────────────────────────────────────────────

type CellState = "direct" | "inherited" | "none";

function getCellState(row: Row, appletId: string): CellState {
  if (row.type === "authority") {
    return row.apps.includes(appletId) ? "direct" : "none";
  }
  if (row.userSpecificApps.includes(appletId)) return "direct";
  if (row.authorityApps.includes(appletId)) return "inherited";
  return "none";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AppAccessManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<AppletColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [userFilterItems, setUserFilterItems] = useState<UserFilterItem[]>([]);
  const [authorityFilterItems, setAuthorityFilterItems] = useState<AuthorityFilterItem[]>([]);
  const [appletFilterItems, setAppletFilterItems] = useState<AppletFilterItem[]>([]);

  const [selectedUsers, setSelectedUsers] = useState<UserFilterItem[]>([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState<AuthorityFilterItem[]>([]);
  const [selectedApplets, setSelectedApplets] = useState<AppletFilterItem[]>([]);

  const addToast = (toast: ToastItem) => setToasts((prev) => [...prev, toast]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authorityManager = new AuthorityManager();
      const userManager = new UserManager();
      const appletManager = new AppletManager();
      const appManager = new AppManager();

      const [authorityData, userData, appletData, appData] = await Promise.all([
        authorityManager.readRecords({}),
        userManager.readRecords({}),
        appletManager.readRecords({}),
        appManager.readRecords({}),
      ]);

      // Build app label lookup
      const appLabelMap: Record<string, string> = {};
      for (const app of appData.records) {
        appLabelMap[app.id] = app.data.label;
      }

      // Build authority lookup (all authorities, including user-specific)
      const authorityLookup: Record<string, {
        name: string;
        apps: string[];
        authorizations: string[];
        appId?: string;
      }> = {};
      for (const record of authorityData.records) {
        authorityLookup[record.id] = {
          name: record.data.name,
          apps: record.data.apps || [],
          authorizations: record.data.authorizations || [],
          appId: record.data.app,
        };
      }

      // Build applet columns
      const appletColumns: AppletColumn[] = appletData.records.map((record) => ({
        id: record.id,
        label: record.data.label,
        appId: record.data.app,
        appLabel: appLabelMap[record.data.app] || record.data.app,
      }));
      appletColumns.sort((a, b) => a.label.localeCompare(b.label));

      // Build authority rows (skip user-specific and contextual authorities)
      const authorityRows: AuthorityRow[] = [];
      for (const record of authorityData.records) {
        if (record.id.startsWith("user-specific:")) continue;
        if (record.data.contextual) continue;

        const authority = record.data;
        const appLabel = authority.app ? appLabelMap[authority.app] : undefined;

        authorityRows.push({
          type: "authority",
          id: record.id,
          name: authority.name,
          iconUrl:
            authority.icon && authority.icon.trim() !== ""
              ? `/api/system/assets/icons/authorities/${record.id}?t=${Date.now()}`
              : undefined,
          appId: authority.app,
          appLabel,
          apps: authority.apps || [],
        });
      }
      authorityRows.sort((a, b) => a.name.localeCompare(b.name));

      // Build user rows
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
          authorityApps: baseAuth?.apps ?? [],
          userSpecificApps: userSpecificAuth?.apps ?? [],
          userSpecificAuthorizations: userSpecificAuth?.authorizations ?? [],
        });
      }
      userRows.sort((a, b) => a.displayName.localeCompare(b.displayName));

      setUserFilterItems(
        userRows.map((r) => ({ id: r.id, displayName: r.displayName, username: r.username })),
      );
      setAuthorityFilterItems(
        authorityRows.map((r) => ({ id: r.id, name: r.name, appId: r.appId, appLabel: r.appLabel })),
      );
      setAppletFilterItems(appletColumns.map((c) => ({ id: c.id, label: c.label, appId: c.appId, appLabel: c.appLabel })));

      setRows([...authorityRows, ...userRows]);
      setColumns(appletColumns);
    } catch (error) {
      console.error("Failed to fetch access data:", error);
      addToast({ message: "Failed to load access data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (row: Row, appletId: string, checked: boolean) => {
    const authorityManager = new AuthorityManager();

    if (row.type === "authority") {
      const newApps = checked
        ? [...new Set([...row.apps, appletId])]
        : row.apps.filter((id) => id !== appletId);

      try {
        await authorityManager.updateRecord(row.id, { apps: newApps }, true);
        setRows((prev) =>
          prev.map((r) => {
            if (r.type === "authority" && r.id === row.id) return { ...r, apps: newApps };
            if (r.type === "user" && r.authorityId === row.id) return { ...r, authorityApps: newApps };
            return r;
          }),
        );
      } catch {
        addToast({ message: "Failed to update authority access", type: "error" });
      }
    } else {
      const newUserSpecificApps = checked
        ? [...new Set([...row.userSpecificApps, appletId])]
        : row.userSpecificApps.filter((id) => id !== appletId);

      try {
        await authorityManager.upsertRecord(`user-specific:${row.id}`, {
          name: `User-specific: ${row.displayName}`,
          authorizations: row.userSpecificAuthorizations,
          apps: newUserSpecificApps,
          user_id: row.id,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.type === "user" && r.id === row.id
              ? { ...r, userSpecificApps: newUserSpecificApps }
              : r,
          ),
        );
      } catch {
        addToast({ message: "Failed to update user access", type: "error" });
      }
    }
  };

  const handleInheritedClick = (authorityName: string) => {
    addToast({
      message: `Access is inherited from "${authorityName}". Edit that authority to remove it.`,
      type: "error",
    });
  };

  // ── Filtered rows & columns ────────────────────────────────────────────────

  const filteredRows = rows.filter((row) => {
    if (row.type === "authority") {
      return selectedAuthorities.length === 0 || selectedAuthorities.some((f) => f.id === row.id);
    }
    return selectedUsers.length === 0 || selectedUsers.some((f) => f.id === row.id);
  });

  const filteredColumns =
    selectedApplets.length === 0
      ? columns
      : columns.filter((c) => selectedApplets.some((f) => f.id === c.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className={styles.loadingState}>Loading access data…</div>;
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
            filterItem={(item, term) =>
              item.name.toLowerCase().includes(term.toLowerCase())
            }
            selectedItems={selectedAuthorities}
            onSelectionChange={setSelectedAuthorities}
            getItemKey={(item) => item.id}
            multiSelect
            placeholder="Filter authorities…"
          />
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Applets</span>
          <SearchableCombobox<AppletFilterItem>
            items={appletFilterItems}
            renderItem={(item, context) =>
              context === "pill" ? (
                <span className={styles.pillContent}>
                  {item.label}
                  <span className={styles.pillSeparator}>·</span>
                  <Badge variant={item.appId === "system" ? "purple" : "blue"}>
                    {item.appLabel}
                  </Badge>
                </span>
              ) : (
                <div className={styles.dropdownItem}>
                  <span className={styles.dropdownPrimary}>{item.label}</span>
                  <Badge variant={item.appId === "system" ? "purple" : "blue"}>
                    {item.appLabel}
                  </Badge>
                </div>
              )
            }
            filterItem={(item, term) =>
              item.label.toLowerCase().includes(term.toLowerCase()) ||
              item.appLabel.toLowerCase().includes(term.toLowerCase())
            }
            selectedItems={selectedApplets}
            onSelectionChange={setSelectedApplets}
            getItemKey={(item) => item.id}
            multiSelect
            placeholder="Filter applets…"
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
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {filteredColumns.length === 0 ? (
          <div className={styles.emptyState}>No applets match the current filter.</div>
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
                      <span className={styles.columnLabel}>{col.label}</span>
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
                  <td
                    colSpan={filteredColumns.length + 1}
                    className={styles.emptyCell}
                  >
                    No rows match the current filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className={styles.dataRow}>
                    {/* Sticky row header */}
                    <td className={`${styles.rowHeader} ${row.type === "user" ? styles.userRowHeader : styles.authorityRowHeader}`}>
                      {row.type === "authority" ? (
                        <div className={styles.rowHeaderContent}>
                          {row.iconUrl ? (
                            <img
                              src={row.iconUrl}
                              alt={row.name}
                              className={styles.rowIcon}
                            />
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
                      const isInherited = state === "inherited";

                      return (
                        <td
                          key={col.id}
                          className={`${styles.dataCell} ${isInherited ? styles.inheritedCell : ""}`}
                        >
                          <div
                            className={styles.cellContainer}
                            onClick={
                              isInherited
                                ? () =>
                                    handleInheritedClick(
                                      (row as UserRow).authorityName,
                                    )
                                : undefined
                            }
                            style={isInherited ? { cursor: "help" } : undefined}
                          >
                            <input
                              type="checkbox"
                              className={`${styles.checkbox} ${isInherited ? styles.inheritedCheckbox : ""}`}
                              checked={state !== "none"}
                              disabled={isInherited}
                              onChange={
                                !isInherited
                                  ? (e) => handleToggle(row, col.id, e.target.checked)
                                  : undefined
                              }
                              title={
                                isInherited
                                  ? `Inherited from "${(row as UserRow).authorityName}"`
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
