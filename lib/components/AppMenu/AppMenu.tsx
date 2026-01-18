"use client";

import { useState, useEffect } from "react";
import Tabset, { TabsetItem } from "../Tabset/Tabset";
import styles from "./AppMenu.module.css";

interface App {
  id: string;
  label: string;
}

interface AppMenuProps {
  onTabChange?: (appId: string | null) => void;
}

export default function AppMenu({ onTabChange }: AppMenuProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    try {
      const response = await fetch("/api/system/settings/user");
      if (response.ok) {
        const data = await response.json();
        const userApps = data.userApps || [];
        setApps(userApps);
      }
    } catch (error) {
      console.error("Error loading apps:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.appMenu}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  const tabItems: TabsetItem[] = [
    {
      label: "Home",
      path: "/",
    },
    ...apps.map((app) => ({
      label: app.label,
      path: `/app/${app.id}`,
    })),
  ];

  return (
    <div className={styles.appMenu}>
      <div className={styles.container}>
        <Tabset items={tabItems} variant="horizontal" />
      </div>
    </div>
  );
}
