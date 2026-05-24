"use client";

import { useState } from "react";
import Tabset, { TabsetItem } from "./utility/Tabset";
import AppLauncherModal from "./Navigation/AppLauncherModal";
import type { LauncherData } from "./Navigation/Navigation";

interface HomeTabBarProps {
  items: TabsetItem[];
  density?: "full" | "name" | "icon";
  launcherData: LauncherData;
}

export default function HomeTabBar({ items, density = "full", launcherData }: HomeTabBarProps) {
  const [showLauncher, setShowLauncher] = useState(false);

  return (
    <>
      <Tabset
        items={items}
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
        />
      )}
    </>
  );
}
