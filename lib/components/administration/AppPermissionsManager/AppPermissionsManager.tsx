"use client";

import { useState, useEffect } from "react";
import SearchableCombobox from "../../utility/SearchableCombobox/SearchableCombobox";
import Badge from "../../utility/Badge/Badge";
import ToastStack, { ToastItem } from "../../utility/Toast";
import AuthorityManager from "@/lib/client/managers/authority";
import AuthorizationManager from "@/lib/client/managers/authorization";
import AppManager from "@/lib/client/managers/app";
import styles from "./AppPermissionsManager.module.css";

// ── Row type ─────────────────────────────────────────────────────────────────

interface AppAuthorityRow {
  id: string;
  name: string;
  appId: string;
  appLabel: string;
  authorizations: string[];
  /** Permissions the app declared as required at install time — cannot be revoked */
  requiredPermissions: string[];
}

// ── Column type ──────────────────────────────────────────────────────────────

interface AuthorizationColumn {
  id: string;
  name: string;
  appId: string;
  appLabel: string;
}

// ── Filter item types ────────────────────────────────────────────────────────

interface AuthorityFilterItem {
  id: string;
  name: string;
  appId: string;
  appLabel: string;
}

interface PermissionFilterItem {
  id: string;
  name: string;
  appId: string;
  appLabel: string;
}

// ── Cell state ───────────────────────────────────────────────────────────────

type CellState =
  | "editable-checked"
  | "editable-unchecked"
  /** Permission belongs to this row's own app — fully locked */
  | "own-app-locked"
  /** Required by app install — locked checked, cannot revoke */
  | "required-locked";

function getCellState(row: AppAuthorityRow, col: AuthorizationColumn): CellState {
  if (col.appId === row.appId) return "own-app-locked";
  if (row.requiredPermissions.includes(col.id)) return "required-locked";
  return row.authorizations.includes(col.id) ? "editable-checked" : "editable-unchecked";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AppPermissionsManager() {
  const [rows, setRows] = useState<AppAuthorityRow[]>([]);
  const [columns, setColumns] = useState<AuthorizationColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [authorityFilterItems, setAuthorityFilterItems] = useState<AuthorityFilterItem[]>([]);
  const [permissionFilterItems, setPermissionFilterItems] = useState<PermissionFilterItem[]>([]);

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
      const appManager = new AppManager();

      const [authorityData, authorizationData, appData] = await Promise.all([
        authorityManager.readRecords({}),
        authorizationManager.readRecords({}),
        appManager.readRecords({}),
      ]);

      // App label + required_permissions lookup
      const appLabelMap: Record<string, string> = {};
      const appRequiredPermissionsMap: Record<string, string[]> = {};
      for (const app of appData.records) {
        appLabelMap[app.id] = app.data.label;
        appRequiredPermissionsMap[app.id] = app.data.required_permissions || [];
      }

      // Authorization columns — only app-targeted, non-contextual
      const authColumns: AuthorizationColumn[] = authorizationData.records
        .filter((r) => r.data.target === "app" && !r.data.contextual)
        .map((r) => ({
          id: r.id,
          name: r.data.name,
          appId: r.data.app,
          appLabel: appLabelMap[r.data.app] || r.data.app,
        }));
      authColumns.sort((a, b) => a.name.localeCompare(b.name));

      // Rows — only app-specific authorities, no icons
      const appId = (r: { id: string; data: { app?: string } }) =>
        r.data.app ?? r.id.replace("app-specific:", "");

      const appRows: AppAuthorityRow[] = authorityData.records
        .filter((r) => r.id.startsWith("app-specific:"))
        .map((r) => {
          const aid = appId(r);
          return {
            id: r.id,
            name: r.data.name,
            appId: aid,
            appLabel: appLabelMap[aid] ?? aid,
            authorizations: r.data.authorizations || [],
            requiredPermissions: appRequiredPermissionsMap[aid] || [],
          };
        });
      appRows.sort((a, b) => a.appLabel.localeCompare(b.appLabel));

      setAuthorityFilterItems(
        appRows.map((r) => ({ id: r.id, name: r.name, appId: r.appId, appLabel: r.appLabel })),
      );
      setPermissionFilterItems(
        authColumns.map((c) => ({ id: c.id, name: c.name, appId: c.appId, appLabel: c.appLabel })),
      );

      setRows(appRows);
      setColumns(authColumns);
    } catch (error) {
      console.error("Failed to fetch app permissions data:", error);
      addToast({ message: "Failed to load app permissions data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (row: AppAuthorityRow, authId: string, checked: boolean) => {
    const authorityManager = new AuthorityManager();

    const newAuthorizations = checked
      ? [...new Set([...row.authorizations, authId])]
      : row.authorizations.filter((id) => id !== authId);

    try {
      await authorityManager.updateRecord(row.id, { authorizations: newAuthorizations }, true);
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, authorizations: newAuthorizations } : r)),
      );
    } catch {
      addToast({ message: "Failed to update app authority permissions", type: "error" });
    }
  };

  const handleLockedClick = (state: CellState, row: AppAuthorityRow, col: AuthorizationColumn) => {
    if (state === "own-app-locked") {
      addToast({
        message: `Permissions belonging to ${row.appLabel} cannot be managed on its own authority.`,
        type: "error",
      });
    } else if (state === "required-locked") {
      addToast({
        message: `"${col.name}" is a required permission for ${row.appLabel} and cannot be revoked.`,
        type: "error",
      });
    }
  };

  // ── Filtered rows & columns ────────────────────────────────────────────────

  const filteredRows =
    selectedAuthorities.length === 0
      ? rows
      : rows.filter((r) => selectedAuthorities.some((f) => f.id === r.id));

  const filteredColumns =
    selectedPermissions.length === 0
      ? columns
      : columns.filter((c) => selectedPermissions.some((f) => f.id === c.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className={styles.loadingState}>Loading app permissions data…</div>;
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
          <span className={styles.filterLabel}>App Authorities</span>
          <SearchableCombobox<AuthorityFilterItem>
            items={authorityFilterItems}
            renderItem={(item, context) =>
              context === "pill" ? (
                <span className={styles.pillContent}>
                  {item.name}
                  <span className={styles.pillSeparator}>·</span>
                  <Badge variant="blue">{item.appLabel}</Badge>
                </span>
              ) : (
                <div className={styles.dropdownItem}>
                  <span className={styles.dropdownPrimary}>{item.name}</span>
                  <Badge variant="blue">{item.appLabel}</Badge>
                </div>
              )
            }
            filterItem={(item, term) =>
              item.name.toLowerCase().includes(term.toLowerCase()) ||
              item.appLabel.toLowerCase().includes(term.toLowerCase())
            }
            selectedItems={selectedAuthorities}
            onSelectionChange={setSelectedAuthorities}
            getItemKey={(item) => item.id}
            multiSelect
            placeholder="Filter app authorities…"
          />
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>App Permissions</span>
          <SearchableCombobox<PermissionFilterItem>
            items={permissionFilterItems}
            renderItem={(item, context) =>
              context === "pill" ? (
                <span className={styles.pillContent}>
                  {item.name}
                  <span className={styles.pillSeparator}>·</span>
                  <Badge variant="blue">{item.appLabel}</Badge>
                </span>
              ) : (
                <div className={styles.dropdownItem}>
                  <span className={styles.dropdownPrimary}>{item.name}</span>
                  <Badge variant="blue">{item.appLabel}</Badge>
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
            placeholder="Filter app permissions…"
          />
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendEditable} />
          Editable
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendRequired} />
          Required by install (cannot revoke)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendOwnApp} />
          Own-app permission (locked)
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {filteredColumns.length === 0 ? (
          <div className={styles.emptyState}>No app permissions match the current filter.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.headerCell} ${styles.cornerCell}`}>
                  <span className={styles.cornerLabel}>App Authorities</span>
                </th>
                {filteredColumns.map((col) => (
                  <th key={col.id} className={styles.headerCell}>
                    <div className={styles.columnHeader}>
                      <span className={styles.columnLabel}>{col.name}</span>
                      <Badge variant="blue">{col.appLabel}</Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={filteredColumns.length + 1} className={styles.emptyCell}>
                    No app authorities match the current filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className={styles.dataRow}>
                    {/* Sticky row header — no icon */}
                    <td className={styles.rowHeader}>
                      <div className={styles.rowHeaderContent}>
                        <div className={styles.rowHeaderText}>
                          <span className={styles.rowPrimary}>{row.name}</span>
                        </div>
                        <Badge variant="blue">{row.appLabel}</Badge>
                      </div>
                    </td>

                    {/* Data cells */}
                    {filteredColumns.map((col) => {
                      const state = getCellState(row, col);
                      const isLocked = state === "own-app-locked" || state === "required-locked";
                      const isChecked = state !== "editable-unchecked" && state !== "own-app-locked";

                      return (
                        <td
                          key={col.id}
                          className={`${styles.dataCell} ${
                            state === "required-locked"
                              ? styles.requiredCell
                              : state === "own-app-locked"
                              ? styles.ownAppCell
                              : ""
                          }`}
                        >
                          <div
                            className={styles.cellContainer}
                            onClick={isLocked ? () => handleLockedClick(state, row, col) : undefined}
                            style={isLocked ? { cursor: "help" } : undefined}
                          >
                            <input
                              type="checkbox"
                              className={`${styles.checkbox} ${isLocked ? styles.lockedCheckbox : ""}`}
                              checked={isChecked}
                              disabled={isLocked}
                              onChange={
                                !isLocked
                                  ? (e) => handleToggle(row, col.id, e.target.checked)
                                  : undefined
                              }
                              title={
                                state === "required-locked"
                                  ? `Required by ${row.appLabel} — cannot revoke`
                                  : state === "own-app-locked"
                                  ? `Own-app permission — cannot manage`
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
