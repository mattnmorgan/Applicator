"use client";

import { useMemo, useState } from "react";
import Tabset, { TabsetItem } from "./utility/Tabset";
import AppLauncherModal from "./Navigation/AppLauncherModal";
import type { LauncherData } from "./Navigation/Navigation";

interface HomeTabBarProps {
  allItems: TabsetItem[];
  initialPinnedIds: string[];
  density?: "full" | "name" | "icon";
  launcherData: LauncherData;
}

export default function HomeTabBar({
  allItems,
  initialPinnedIds,
  density = "full",
  launcherData,
}: HomeTabBarProps) {
  const [showLauncher, setShowLauncher] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>(initialPinnedIds);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  // Always show Home; only show app tabs that are pinned
  const visibleItems = useMemo(
    () => allItems.filter((item) => item.path === "/" || (item.path?.startsWith("/app/") && pinnedIds.includes(item.path.slice(5)))),
    [allItems, pinnedIds],
  );

  const handlePinToggle = async (appletId: string, currentlyPinned: boolean) => {
    const next = currentlyPinned
      ? pinnedIds.filter((id) => id !== appletId)
      : [...pinnedIds, appletId];
    setPinnedIds(next);

    try {
      await fetch("/api/system/settings/hotbar", {
        method: currentlyPinned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appletId }),
      });
    } catch {
      setPinnedIds(pinnedIds); // revert on error
    }
  };

  return (
    <>
      <Tabset
        items={visibleItems}
        variant="horizontal"
        density={density}
        stickyItems={[
          { label: "App Launcher", icon: "sandwich", onClick: () => setShowLauncher(true) },
        ]}
      />
      {showLauncher && (
        <AppLauncherModal
          launcherData={launcherData}
          onClose={() => setShowLauncher(false)}
          pinnedIds={pinnedSet}
          onPinToggle={handlePinToggle}
        />
      )}
    </>
  );
}
