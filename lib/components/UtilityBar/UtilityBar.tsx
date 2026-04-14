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

export interface WindowState {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface UtilityBarProps {
  applets: UtilityBarAppletInfo[];
  density: "full" | "name" | "icon";
  savedWindowStates: Record<string, WindowState>;
  userId: string;
  /** App ID whose utility-bar applets should be disabled (e.g. when viewing that app) */
  disabledAppId?: string;
}

type DragState =
  | {
      type: "move";
      appletId: string;
      startMouseXPct: number;
      startMouseYPct: number;
      startXPct: number;
      startYPct: number;
    }
  | {
      type: "resize";
      appletId: string;
      edge: "n" | "s" | "e" | "w";
      startMouseXPct: number;
      startMouseYPct: number;
      startState: WindowState;
    };

const MIN_WIDTH_PCT = 10;
const MIN_HEIGHT_PCT = 15;
const DEFAULT_WIDTH_PCT = 25;
const DEFAULT_HEIGHT_PCT = 40;

function roundPct(v: number): number {
  return Math.round(v * 10) / 10;
}

function toXPct(px: number): number {
  return roundPct((px / window.innerWidth) * 100);
}

function toYPct(px: number): number {
  return roundPct((px / window.innerHeight) * 100);
}

export default function UtilityBar({
  applets,
  density,
  savedWindowStates,
  userId,
  disabledAppId,
}: UtilityBarProps) {
  const [moduleUrls, setModuleUrls] = useState<Record<string, string>>({});
  const [versionsLoaded, setVersionsLoaded] = useState(false);
  const [openAppletId, setOpenAppletId] = useState<string | null>(null);
  const [poppedOut, setPoppedOut] = useState<Set<string>>(new Set());
  const [minimizedWindows, setMinimizedWindows] = useState<Set<string>>(new Set());
  const [windowStates, setWindowStates] =
    useState<Record<string, WindowState>>(savedWindowStates);
  const [barTooltip, setBarTooltip] = useState<{ label: string; x: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const draggingRef = useRef<DragState | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
        // non-critical — components won't render but bar still shows
      }
      setVersionsLoaded(true);
    };
    load();
  }, [applets]);

  const saveWindowStates = useCallback(
    async (states: Record<string, WindowState>) => {
      try {
        const settingManager = new SettingManager();
        await settingManager.upsertRecord(`${userId}:ui:utilityBarPositions`, {
          value: JSON.stringify(states),
          name: "ui:utilityBarPositions",
          user: userId,
        });
      } catch {
        // non-critical — state just won't persist
      }
    },
    [userId],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;

      const mouseXPct = toXPct(e.clientX);
      const mouseYPct = toYPct(e.clientY);
      const deltaXPct = roundPct(mouseXPct - drag.startMouseXPct);
      const deltaYPct = roundPct(mouseYPct - drag.startMouseYPct);

      if (drag.type === "move") {
        setWindowStates((prev) => {
          const current = prev[drag.appletId];
          if (!current) return prev;
          const newX = roundPct(
            Math.min(
              Math.max(0, drag.startXPct + deltaXPct),
              100 - current.widthPct,
            ),
          );
          const newY = roundPct(
            Math.min(
              Math.max(0, drag.startYPct + deltaYPct),
              100 - current.heightPct,
            ),
          );
          return {
            ...prev,
            [drag.appletId]: { ...current, xPct: newX, yPct: newY },
          };
        });
      } else {
        const s = drag.startState;
        let { xPct, yPct, widthPct, heightPct } = s;

        switch (drag.edge) {
          case "n": {
            // top edge: clamp so window stays on screen and respects min height
            const maxDelta = s.heightPct - MIN_HEIGHT_PCT;
            const clampedDelta = Math.min(Math.max(deltaYPct, -s.yPct), maxDelta);
            yPct = roundPct(s.yPct + clampedDelta);
            heightPct = roundPct(s.heightPct - clampedDelta);
            break;
          }
          case "s": {
            // bottom edge: clamp so bottom doesn't exceed 100vh
            const maxHeight = roundPct(100 - s.yPct);
            heightPct = roundPct(
              Math.min(Math.max(s.heightPct + deltaYPct, MIN_HEIGHT_PCT), maxHeight),
            );
            break;
          }
          case "w": {
            // left edge: clamp so window stays on screen and respects min width
            const maxDelta = s.widthPct - MIN_WIDTH_PCT;
            const clampedDelta = Math.min(Math.max(deltaXPct, -s.xPct), maxDelta);
            xPct = roundPct(s.xPct + clampedDelta);
            widthPct = roundPct(s.widthPct - clampedDelta);
            break;
          }
          case "e": {
            // right edge: clamp so right side doesn't exceed 100vw
            const maxWidth = roundPct(100 - s.xPct);
            widthPct = roundPct(
              Math.min(Math.max(s.widthPct + deltaXPct, MIN_WIDTH_PCT), maxWidth),
            );
            break;
          }
        }

        setWindowStates((prev) => ({
          ...prev,
          [drag.appletId]: { xPct, yPct, widthPct, heightPct },
        }));
      }
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      setIsDragging(false);
      setWindowStates((prev) => {
        saveWindowStates(prev);
        return prev;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [saveWindowStates]);

  const handleTabClick = (appletId: string) => {
    setOpenAppletId((prev) => (prev === appletId ? null : appletId));
  };

  const handlePopOut = (appletId: string) => {
    setWindowStates((prev) => {
      if (prev[appletId]) return prev;
      return {
        ...prev,
        [appletId]: {
          xPct: roundPct(((window.innerWidth / 2 - 200) / window.innerWidth) * 100),
          yPct: 15,
          widthPct: DEFAULT_WIDTH_PCT,
          heightPct: DEFAULT_HEIGHT_PCT,
        },
      };
    });
    setOpenAppletId(null);
    setPoppedOut((prev) => new Set([...prev, appletId]));
  };

  // "Return to bar" — docks the window and opens its panel
  const handleReturnToBar = (appletId: string) => {
    setPoppedOut((prev) => {
      const next = new Set(prev);
      next.delete(appletId);
      return next;
    });
    setOpenAppletId(appletId);
  };

  const handleToggleMinimize = (appletId: string) => {
    setMinimizedWindows((prev) => {
      const next = new Set(prev);
      if (next.has(appletId)) {
        next.delete(appletId);
      } else {
        next.add(appletId);
      }
      return next;
    });
  };

  // "Close" — docks the window without opening its panel
  const handleClose = (appletId: string) => {
    setPoppedOut((prev) => {
      const next = new Set(prev);
      next.delete(appletId);
      return next;
    });
  };

  const handleDragStart = (appletId: string, e: React.MouseEvent) => {
    // Don't start a drag when the user clicks a button inside the header
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const state = windowStates[appletId];
    if (!state) return;
    draggingRef.current = {
      type: "move",
      appletId,
      startMouseXPct: toXPct(e.clientX),
      startMouseYPct: toYPct(e.clientY),
      startXPct: state.xPct,
      startYPct: state.yPct,
    };
    setIsDragging(true);
  };

  const handleResizeStart = (
    appletId: string,
    edge: "n" | "s" | "e" | "w",
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const state = windowStates[appletId];
    if (!state) return;
    draggingRef.current = {
      type: "resize",
      appletId,
      edge,
      startMouseXPct: toXPct(e.clientX),
      startMouseYPct: toYPct(e.clientY),
      startState: { ...state },
    };
    setIsDragging(true);
  };

  if (applets.length === 0) return null;

  const barApplets = applets.filter((a) => !poppedOut.has(a.appletId));
  const poppedOutApplets = applets.filter((a) => poppedOut.has(a.appletId));
  const openApplet = barApplets.find((a) => a.appletId === openAppletId) ?? null;

  return (
    <>
      {/* Expanded panel — renders above the bar for the active tab */}
      {openApplet && (
        <div className={styles.openPanel}>
          <div className={styles.openPanelHeader}>
            <div className={styles.openPanelInfo}>
              <img
                src={openApplet.iconUrl}
                alt=""
                className={styles.openPanelIcon}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className={styles.openPanelLabel}>{openApplet.label}</span>
            </div>
            <div className={styles.openPanelActions}>
              {openApplet.poppable && !isMobile && (
                <ButtonIcon
                  name="popout"
                  label="Pop out"
                  iconSize={13}
                  size="sm"
                  onClick={() => handlePopOut(openApplet.appletId)}
                  placement="top"
                />
              )}
              <ButtonIcon
                name="close"
                label="Close"
                iconSize={13}
                size="sm"
                onClick={() => setOpenAppletId(null)}
                placement="top"
              />
            </div>
          </div>
          <div className={styles.openPanelContent}>
            {versionsLoaded && moduleUrls[openApplet.app] && (
              <DynamicAppLoader
                moduleUrl={moduleUrls[openApplet.app]}
                componentName={openApplet.component}
                componentProps={{
                  context: { appId: openApplet.app, path: [] },
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className={styles.utilityBar}>
        {barApplets.map((applet) => {
          const isDisabled = applet.app === disabledAppId;
          return (
          <button
            key={applet.appletId}
            className={`${styles.barItem} ${
              openAppletId === applet.appletId ? styles.barItemActive : ""
            } ${isDisabled ? styles.barItemDisabled : ""}`}
            onClick={() => !isDisabled && handleTabClick(applet.appletId)}
            disabled={isDisabled}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setBarTooltip({ label: applet.label, x: rect.left + rect.width / 2 });
            }}
            onMouseLeave={() => setBarTooltip(null)}
          >
            {density !== "name" && (
              <img
                src={applet.iconUrl}
                alt=""
                className={styles.barItemIcon}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {density !== "icon" && (
              <span className={styles.barItemLabel}>{applet.label}</span>
            )}
          </button>
          );
        })}
      </div>

      {/* Hover tooltip — appears above the bar, centred on the hovered item */}
      {barTooltip && (
        <div
          className={styles.barTooltip}
          style={{ left: barTooltip.x }}
        >
          {barTooltip.label}
        </div>
      )}

      {/* Popped-out floating windows */}
      {poppedOutApplets.map((applet) => {
        const ws = windowStates[applet.appletId] ?? {
          xPct: 30,
          yPct: 15,
          widthPct: DEFAULT_WIDTH_PCT,
          heightPct: DEFAULT_HEIGHT_PCT,
        };
        const isMinimized = minimizedWindows.has(applet.appletId);
        return (
          <div
            key={applet.appletId}
            className={styles.poppedWindow}
            style={{
              left: `${ws.xPct}vw`,
              top: `${ws.yPct}vh`,
              width: `${ws.widthPct}vw`,
              height: isMinimized ? "auto" : `${ws.heightPct}vh`,
            }}
          >
            {!isMinimized && (
              <>
                <div
                  className={styles.resizeN}
                  onMouseDown={(e) => handleResizeStart(applet.appletId, "n", e)}
                />
                <div
                  className={styles.resizeS}
                  onMouseDown={(e) => handleResizeStart(applet.appletId, "s", e)}
                />
                <div
                  className={styles.resizeW}
                  onMouseDown={(e) => handleResizeStart(applet.appletId, "w", e)}
                />
                <div
                  className={styles.resizeE}
                  onMouseDown={(e) => handleResizeStart(applet.appletId, "e", e)}
                />
              </>
            )}
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
                  name={isMinimized ? "chevron-up" : "chevron-down"}
                  label={isMinimized ? "Expand" : "Minimize"}
                  iconSize={13}
                  size="sm"
                  onClick={() => handleToggleMinimize(applet.appletId)}
                  placement="bottom"
                />
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
                  onClick={() => handleClose(applet.appletId)}
                  placement="bottom"
                />
              </div>
            </div>
            {!isMinimized && (
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
            )}
          </div>
        );
      })}

      {/* Fullscreen capture overlay — prevents applet content from stealing
          mouse events during any drag or resize operation */}
      {isDragging && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            cursor: (() => {
              const d = draggingRef.current;
              if (!d) return "default";
              if (d.type === "move") return "move";
              return `${d.edge}-resize`;
            })(),
          }}
        />
      )}
    </>
  );
}
