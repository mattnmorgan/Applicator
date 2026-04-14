"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DynamicAppLoader from "@/lib/components/utility/DynamicAppLoader";
import AppManager from "@/lib/client/managers/app";
import SettingManager from "@/lib/client/managers/setting";
import ButtonIcon from "@/lib/components/utility/ButtonIcon";
import styles from "./UtilityBar.module.css";

export interface UtilityBarAppletInfo {
  appletId: string;
  label: string;
  app: string;
  component: string;
  poppable: boolean;
  iconUrl: string;
}

interface Position {
  x: number;
  y: number;
}

export interface UtilityBarProps {
  applets: UtilityBarAppletInfo[];
  density: "full" | "name" | "icon";
  savedPositions: Record<string, Position>;
  userId: string;
}

const DEFAULT_POPPED_WIDTH = 320;
const DEFAULT_POPPED_Y = 100;

export default function UtilityBar({
  applets,
  density,
  savedPositions,
  userId,
}: UtilityBarProps) {
  const [moduleUrls, setModuleUrls] = useState<Record<string, string>>({});
  const [versionsLoaded, setVersionsLoaded] = useState(false);
  const [poppedOut, setPoppedOut] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [positions, setPositions] = useState<Record<string, Position>>(savedPositions);
  const [isMobile, setIsMobile] = useState(false);

  const draggingRef = useRef<{
    appletId: string;
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load app module URLs
  useEffect(() => {
    const load = async () => {
      if (applets.length === 0) {
        setVersionsLoaded(true);
        return;
      }
      const appManager = new AppManager();
      const uniqueAppIds = [...new Set(applets.map((a) => a.app))];
      try {
        const result = await appManager.readRecords({ ids: uniqueAppIds });
        const urls: Record<string, string> = {};
        for (const record of result.records || []) {
          const v = record.data.version;
          urls[record.id] = `/api/${record.id}/assets/source?v=${v.major}.${v.minor}.${v.dev}`;
        }
        setModuleUrls(urls);
      } catch {
        // Version load failure — components won't render but bar still shows
      }
      setVersionsLoaded(true);
    };
    load();
  }, [applets]);

  // Save positions to DB
  const savePositions = useCallback(
    async (newPositions: Record<string, Position>) => {
      try {
        const settingManager = new SettingManager();
        await settingManager.upsertRecord(`${userId}:ui:utilityBarPositions`, {
          value: JSON.stringify(newPositions),
          name: "ui:utilityBarPositions",
          user: userId,
        });
      } catch {
        // Non-critical — position just won't persist
      }
    },
    [userId],
  );

  // Global drag tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const { appletId, startMouseX, startMouseY, startPosX, startPosY } =
        draggingRef.current;
      setPositions((prev) => ({
        ...prev,
        [appletId]: {
          x: startPosX + e.clientX - startMouseX,
          y: startPosY + e.clientY - startMouseY,
        },
      }));
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      setPositions((prev) => {
        savePositions(prev);
        return prev;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [savePositions]);

  const handlePopOut = (appletId: string) => {
    if (!positions[appletId]) {
      const x = Math.max(0, window.innerWidth - 280 - DEFAULT_POPPED_WIDTH - 20);
      setPositions((prev) => ({ ...prev, [appletId]: { x, y: DEFAULT_POPPED_Y } }));
    }
    setPoppedOut((prev) => new Set([...prev, appletId]));
  };

  const handleReturnToBar = (appletId: string) => {
    setPoppedOut((prev) => {
      const next = new Set(prev);
      next.delete(appletId);
      return next;
    });
  };

  const handleDismiss = (appletId: string) => {
    setPoppedOut((prev) => {
      const next = new Set(prev);
      next.delete(appletId);
      return next;
    });
    setDismissed((prev) => new Set([...prev, appletId]));
  };

  const handleDragStart = (appletId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const pos = positions[appletId] ?? { x: 0, y: 0 };
    draggingRef.current = {
      appletId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
  };

  if (applets.length === 0) return null;

  const inBarApplets = applets.filter(
    (a) => !poppedOut.has(a.appletId) && !dismissed.has(a.appletId),
  );
  const poppedOutApplets = applets.filter((a) => poppedOut.has(a.appletId));

  return (
    <>
      {/* Sidebar */}
      <div className={styles.utilityBar}>
        {inBarApplets.map((applet) => (
          <div key={applet.appletId} className={styles.appletSection}>
            <div
              className={`${styles.appletHeader} ${styles[`density_${density}`]}`}
            >
              <div className={styles.appletHeaderInfo}>
                <img
                  src={applet.iconUrl}
                  alt=""
                  className={styles.appletIcon}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                {density !== "icon" && (
                  <span className={styles.appletLabel} title={applet.label}>
                    {applet.label}
                  </span>
                )}
              </div>
              {applet.poppable && !isMobile && (
                <ButtonIcon
                  name="popout"
                  label="Pop out"
                  iconSize={13}
                  size="sm"
                  onClick={() => handlePopOut(applet.appletId)}
                  placement="left"
                />
              )}
            </div>
            <div className={styles.appletContent}>
              {versionsLoaded && moduleUrls[applet.app] && (
                <DynamicAppLoader
                  moduleUrl={moduleUrls[applet.app]}
                  componentName={applet.component}
                  componentProps={{
                    context: { appId: applet.app, path: [] },
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Popped-out floating windows */}
      {poppedOutApplets.map((applet) => {
        const pos = positions[applet.appletId] ?? { x: 100, y: DEFAULT_POPPED_Y };
        return (
          <div
            key={applet.appletId}
            className={styles.poppedWindow}
            style={{ left: pos.x, top: pos.y }}
          >
            <div
              className={styles.poppedHeader}
              onMouseDown={(e) => handleDragStart(applet.appletId, e)}
            >
              <div className={styles.poppedHeaderInfo}>
                <img
                  src={applet.iconUrl}
                  alt=""
                  className={styles.poppedIcon}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className={styles.poppedLabel}>{applet.label}</span>
              </div>
              <div className={styles.poppedActions}>
                <ButtonIcon
                  name="dock"
                  label="Return to bar"
                  iconSize={13}
                  size="sm"
                  onClick={() => handleReturnToBar(applet.appletId)}
                  placement="bottom"
                />
                <ButtonIcon
                  name="close"
                  label="Close"
                  iconSize={13}
                  size="sm"
                  onClick={() => handleDismiss(applet.appletId)}
                  placement="bottom"
                />
              </div>
            </div>
            <div className={styles.poppedContent}>
              {versionsLoaded && moduleUrls[applet.app] && (
                <DynamicAppLoader
                  moduleUrl={moduleUrls[applet.app]}
                  componentName={applet.component}
                  componentProps={{
                    context: { appId: applet.app, path: [] },
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
