"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Modal from "../utility/Modal";
import Icon from "../utility/Icon";
import { LauncherData, LauncherItem } from "./Navigation";
import styles from "./AppLauncherModal.module.css";

interface AppLauncherModalProps {
  launcherData: LauncherData;
  onClose: () => void;
  pinnedIds?: Set<string>;
  onPinToggle?: (appletId: string, pinned: boolean) => void;
}

function filterItems(items: LauncherItem[], query: string): LauncherItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      (item.appLabel && item.appLabel.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)),
  );
}

interface ItemBadgeProps {
  item: LauncherItem;
}

function ItemBadge({ item }: ItemBadgeProps) {
  if (item.appLabel) {
    return (
      <span className={styles.appBadge}>
        {item.appIconUrl && (
          <img
            src={item.appIconUrl}
            alt=""
            className={styles.badgeAppIcon}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <span>{item.appLabel}</span>
      </span>
    );
  }
  return <span className={styles.systemBadge}>System</span>;
}

interface SectionProps {
  title: string;
  items: LauncherItem[];
  onNavigate: (href: string) => void;
  pinnedIds?: Set<string>;
  onPinToggle?: (appletId: string, pinned: boolean) => void;
}

function Section({ title, items, onNavigate, pinnedIds, onPinToggle }: SectionProps) {
  if (items.length === 0) return null;
  const showPins = pinnedIds !== undefined && onPinToggle !== undefined;
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.itemList}>
        {items.map((item, i) => (
          <div key={i} className={styles.itemRow}>
            {showPins && item.appletId && (
              <button
                className={`${styles.pinButton} ${pinnedIds.has(item.appletId) ? styles.pinButtonActive : ""}`}
                onClick={() => onPinToggle(item.appletId!, pinnedIds.has(item.appletId!))}
                title={pinnedIds.has(item.appletId!) ? "Unpin from hotbar" : "Pin to hotbar"}
              >
                <Icon name={pinnedIds.has(item.appletId!) ? "unpin" : "pin"} size={14} />
              </button>
            )}
            <a
              href={item.href}
              className={styles.item}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) return;
                e.preventDefault();
                onNavigate(item.href);
              }}
            >
              <span className={styles.itemText}>
                <span className={styles.itemLabel}>{item.label}</span>
                {item.description && (
                  <span className={styles.itemDescription}>{item.description}</span>
                )}
              </span>
              <ItemBadge item={item} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppLauncherModal({
  launcherData,
  onClose,
  pinnedIds,
  onPinToggle,
}: AppLauncherModalProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleNavigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const filteredApps = filterItems(launcherData.apps, query);
  const filteredUserSettings = filterItems(launcherData.userSettings, query);
  const filteredSystemSettings = launcherData.systemSettings
    ? filterItems(launcherData.systemSettings, query)
    : undefined;
  const filteredDevMenu = launcherData.devMenu
    ? filterItems(launcherData.devMenu, query)
    : undefined;

  const hasAnyResults =
    filteredApps.length > 0 ||
    filteredUserSettings.length > 0 ||
    (filteredSystemSettings !== undefined && filteredSystemSettings.length > 0) ||
    (filteredDevMenu !== undefined && filteredDevMenu.length > 0);

  const header = (
    <div className={styles.searchContainer}>
      <span className={styles.searchIcon}>
        <Icon name="search" size={16} />
      </span>
      <input
        className={styles.searchInput}
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
    </div>
  );

  return (
    <Modal
      header={header}
      closeable
      onClose={onClose}
      maxWidth={800}
      minHeight={75}
      minHeightUnit="vh"
    >
      <div className={styles.body}>
        <Section
          title="Apps"
          items={filteredApps}
          onNavigate={handleNavigate}
          pinnedIds={pinnedIds}
          onPinToggle={onPinToggle}
        />
        <Section
          title="User Preferences"
          items={filteredUserSettings}
          onNavigate={handleNavigate}
        />
        {filteredSystemSettings !== undefined && (
          <Section
            title="System Settings"
            items={filteredSystemSettings}
            onNavigate={handleNavigate}
          />
        )}
        {filteredDevMenu !== undefined && (
          <Section
            title="Developer Menu"
            items={filteredDevMenu}
            onNavigate={handleNavigate}
          />
        )}
        {!hasAnyResults && (
          <div className={styles.empty}>No results found</div>
        )}
      </div>
    </Modal>
  );
}
