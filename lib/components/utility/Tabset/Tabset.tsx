"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Tabset.module.css";
import Icon from "@/lib/components/utility/Icon";

export interface TabsetItem {
  label: string;
  path?: string;
  children?: TabsetItem[];
  clickable?: boolean;
  icon?: string;
}

interface TabsetProps {
  items: TabsetItem[];
  variant?: "vertical" | "horizontal";
  searchable?: boolean;
  autoExpand?: boolean;
  density?: "full" | "name" | "icon";
}

function isIconUrl(icon: string) {
  return icon.startsWith("/") || icon.startsWith("http://") || icon.startsWith("https://");
}

interface TreeItemProps {
  item: TabsetItem;
  currentPath: string;
  searchTerm: string;
  onNavigate: (path: string) => void;
  autoExpand?: boolean;
}

function TreeItem({
  item,
  currentPath,
  searchTerm,
  onNavigate,
  autoExpand = false,
}: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const hasChildren = item.children && item.children.length > 0;
  const isClickable = item.clickable !== false && item.path !== undefined;
  const isActive = item.path === currentPath;

  // Filter children based on search term
  const getFilteredChildren = () => {
    if (!hasChildren || !searchTerm) return item.children;

    return item.children!.filter((child) => {
      const matchesLabel = child.label
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const hasMatchingChildren = child.children?.some((grandchild) =>
        grandchild.label.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      return matchesLabel || hasMatchingChildren;
    });
  };

  const filteredChildren = getFilteredChildren();
  const shouldShow =
    !searchTerm ||
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (filteredChildren && filteredChildren.length > 0);

  if (!shouldShow) return null;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (isClickable && item.path) {
      onNavigate(item.path);
    }
  };

  return (
    <div className={styles.treeItem}>
      <div
        className={`
          ${styles.itemContent}
          ${isActive ? styles.itemContentActive : ""}
          ${!isClickable ? styles.itemContentNonClickable : ""}
        `}
        onClick={handleClick}
      >
        {hasChildren && (
          <span
            className={`${styles.expandIcon} ${isExpanded ? styles.expandIconExpanded : styles.expandIconCollapsed}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M4 2L8 6L4 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        {!hasChildren && <span style={{ width: "16px" }} />}
        <span>{item.label}</span>
      </div>
      {hasChildren &&
        isExpanded &&
        filteredChildren &&
        filteredChildren.length > 0 && (
          <div className={styles.children}>
            {filteredChildren.map((child, index) => (
              <TreeItem
                key={index}
                item={child}
                currentPath={currentPath}
                searchTerm={searchTerm}
                onNavigate={onNavigate}
                autoExpand={autoExpand}
              />
            ))}
          </div>
        )}
    </div>
  );
}

export default function Tabset({
  items,
  variant = "vertical",
  searchable = false,
  autoExpand = false,
  density = "full",
}: TabsetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState("");
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const horizontalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "horizontal") return;
    const el = horizontalRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [variant]);

  const renderHorizontalTabContent = (item: TabsetItem, itemKey: string) => {
    const getIconNode = () => {
      if (item.icon) {
        if (isIconUrl(item.icon)) {
          if (!iconErrors[itemKey]) {
            return (
              <img
                src={item.icon}
                className={styles.horizontalTabIcon}
                onError={() =>
                  setIconErrors((prev) => ({ ...prev, [itemKey]: true }))
                }
                alt=""
              />
            );
          }
          // URL failed to load — fall through to letter placeholder below
        } else {
          return <Icon name={item.icon} size={16} />;
        }
      }
      if (density === "icon") {
        return (
          <span className={styles.horizontalTabLetter}>
            {item.label[0]?.toUpperCase() || "?"}
          </span>
        );
      }
      return null;
    };

    if (density === "name") {
      return <>{item.label}</>;
    }

    const iconNode = getIconNode();

    if (density === "icon") {
      return iconNode;
    }

    // "full": icon (if available) + label
    return (
      <span className={styles.horizontalTabContent}>
        {iconNode}
        {item.label}
      </span>
    );
  };

  if (variant === "horizontal") {
    return (
      <>
      <div ref={horizontalRef} className={styles.tabsetHorizontal}>
        {items.map((item, index) => {
          const isActive = item.path === pathname;
          const isClickable =
            item.clickable !== false && item.path !== undefined;
          const itemKey = item.path || String(index);

          return (
            <div
              key={index}
              className={`${styles.horizontalTab} ${isActive ? styles.horizontalTabActive : ""} ${density === "icon" ? styles.horizontalTabIconOnly : ""}`}
              onClick={() =>
                isClickable && item.path && handleNavigate(item.path)
              }
              onMouseEnter={density === "icon" ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ label: item.label, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
              } : undefined}
              onMouseLeave={density === "icon" ? () => setTooltip(null) : undefined}
              style={{ cursor: isClickable ? "pointer" : "default" }}
            >
              {renderHorizontalTabContent(item, itemKey)}
            </div>
          );
        })}
      </div>
      {tooltip && (
        <div className={styles.tooltip} style={{ top: tooltip.y, left: tooltip.x }}>
          {tooltip.label}
        </div>
      )}
      </>
    );
  }

  return (
    <div className={styles.tabsetVertical}>
      {searchable && (
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}
      {items.map((item, index) => (
        <TreeItem
          key={index}
          item={item}
          currentPath={pathname}
          searchTerm={searchTerm}
          onNavigate={handleNavigate}
          autoExpand={autoExpand}
        />
      ))}
    </div>
  );
}
