"use client";

import React, { useEffect, useRef, useState } from "react";
import ButtonIcon from "../ButtonIcon";
import { IconName } from "../Icon";

export interface DrawerPanelConfig {
  /** Panel width as a percentage (e.g. 25 for 25%). Defaults to 25. */
  width?: number;
  /** Whether the panel is open. Defaults to false. */
  open?: boolean;
  /**
   * `inline` resizes the center content to share space with the panel.
   * `overlay` floats the panel over the center content with a blur backdrop.
   * On small screens (<= 768px), `inline` is treated as `overlay` and the panel
   * expands to 100% width.
   * Defaults to `overlay`.
   */
  type?: "inline" | "overlay";
  /** Show a close (×) button in the panel header. Defaults to false. */
  closeable?: boolean;
  /**
   * Title shown in the panel header. Accepts a string or any React node,
   * allowing custom content such as icons, buttons, or styled elements.
   */
  title?: React.ReactNode;
  /**
   * When true and the panel is closed, a floating open button is rendered
   * anchored to the top corner of the layout container. The button's icon and
   * variant are configured via `iconName` and `variant`. Defaults to false.
   */
  openable?: boolean;
  /** Icon name for the open button. */
  iconName?: IconName;
  /** Variant for the open button. Defaults to `"bordered"`. */
  variant?: "bare" | "bordered";
  /** Called when the close button is clicked. */
  onClose?: () => void;
  /** Called when the open button is clicked. */
  onOpen?: () => void;
  /** Panel content. */
  children?: React.ReactNode;
  /**
   * Padding for the panel content area. Defaults to "16px".
   * Pass 0 or "0" for no padding (useful when panel content manages its own spacing).
   */
  contentPadding?: number | string;
}

export interface DrawerLayoutProps {
  leftPanel?: DrawerPanelConfig;
  rightPanel?: DrawerPanelConfig;
  children: React.ReactNode;
  /** Additional styles applied to the root container. */
  style?: React.CSSProperties;
  /**
   * Whether to apply rounded corners to the layout container.
   * Defaults to true. Pass false for full-bleed layouts.
   */
  rounded?: boolean;
}

const MOBILE_BREAKPOINT = 768;

function resolvePanel(panel: DrawerPanelConfig | undefined) {
  if (!panel) return null;
  return {
    width: panel.width ?? 25,
    open: panel.open ?? false,
    type: panel.type ?? "overlay",
    closeable: panel.closeable ?? false,
    title: panel.title,
    openable: panel.openable ?? false,
    iconName: panel.iconName,
    variant: panel.variant ?? "bordered",
    onClose: panel.onClose,
    onOpen: panel.onOpen,
    children: panel.children,
    contentPadding: panel.contentPadding ?? "16px",
  };
}

interface PanelProps {
  side: "left" | "right";
  config: NonNullable<ReturnType<typeof resolvePanel>> & { contentPadding: number | string };
  isMobile: boolean;
  pixelWidth: number;
}

function DrawerPanel({ side, config, isMobile, pixelWidth }: PanelProps) {
  const isOverlay = config.type === "overlay" || isMobile;
  const isFullWidth = isMobile;

  const panelStyle: React.CSSProperties = isOverlay
    ? {
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: isFullWidth ? "100%" : `${pixelWidth}px`,
        zIndex: 200,
        background: "#1e293b",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow:
          side === "left"
            ? "4px 0 16px rgba(0,0,0,0.4)"
            : "-4px 0 16px rgba(0,0,0,0.4)",
      }
    : {
        width: `${pixelWidth}px`,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: side === "left" ? "1px solid #334155" : undefined,
        borderLeft: side === "right" ? "1px solid #334155" : undefined,
      };

  return (
    <div style={panelStyle}>
      {(config.title != null || config.closeable) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            borderBottom: "1px solid #334155",
            flexShrink: 0,
          }}
        >
          {config.title != null && (
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              {typeof config.title === "string" ? (
                <span
                  style={{
                    display: "block",
                    color: "#f1f5f9",
                    fontWeight: 600,
                    fontSize: "14px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {config.title}
                </span>
              ) : (
                config.title
              )}
            </div>
          )}
          {config.closeable && (
            <ButtonIcon
              name="close"
              iconSize={14}
              label="Close panel"
              onClick={() => config.onClose?.()}
              placement="bottom"
            />
          )}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: config.contentPadding }}>
        {config.children}
      </div>
    </div>
  );
}

export default function DrawerLayout({
  leftPanel: leftPanelProp,
  rightPanel: rightPanelProp,
  children,
  style,
  rounded = true,
}: DrawerLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const left = resolvePanel(leftPanelProp);
  const right = resolvePanel(rightPanelProp);

  const leftIsOverlay = !left || left.type === "overlay" || isMobile;
  const rightIsOverlay = !right || right.type === "overlay" || isMobile;

  const leftPixels = containerRef.current
    ? (containerRef.current.offsetWidth * (left?.width ?? 25)) / 100
    : 250;
  const rightPixels = containerRef.current
    ? (containerRef.current.offsetWidth * (right?.width ?? 25)) / 100
    : 250;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "flex",
        flex: 1,
        overflow: "hidden",
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: rounded ? "10px" : 0,
        ...style,
      }}
    >
      {/* Left inline panel */}
      {left && left.open && !leftIsOverlay && (
        <DrawerPanel
          side="left"
          config={left}
          isMobile={isMobile}
          pixelWidth={leftPixels}
        />
      )}

      {/* Center content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
        }}
      >
        {children}
      </div>

      {/* Right inline panel */}
      {right && right.open && !rightIsOverlay && (
        <DrawerPanel
          side="right"
          config={right}
          isMobile={isMobile}
          pixelWidth={rightPixels}
        />
      )}

      {/* Overlay backdrop + panel for left */}
      {left && left.open && leftIsOverlay && (
        <>
          <div
            onClick={() => left.onClose?.()}
            style={{
              position: "absolute",
              inset: 0,
              backdropFilter: "blur(2px)",
              background: "rgba(0,0,0,0.3)",
              zIndex: 190,
            }}
          />
          <DrawerPanel
            side="left"
            config={left}
            isMobile={isMobile}
            pixelWidth={leftPixels}
          />
        </>
      )}

      {/* Overlay backdrop + panel for right */}
      {right && right.open && rightIsOverlay && (
        <>
          <div
            onClick={() => right.onClose?.()}
            style={{
              position: "absolute",
              inset: 0,
              backdropFilter: "blur(2px)",
              background: "rgba(0,0,0,0.3)",
              zIndex: 190,
            }}
          />
          <DrawerPanel
            side="right"
            config={right}
            isMobile={isMobile}
            pixelWidth={rightPixels}
          />
        </>
      )}

      {/* Open button for left panel — anchored top-left inside the container */}
      {left && !left.open && left.openable && left.iconName && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            zIndex: 100,
            background: "#1e293b",
            borderRadius: "6px",
          }}
        >
          <ButtonIcon
            name={left.iconName}
            label="Open left panel"
            onClick={() => left.onOpen?.()}
            variant={left.variant}
            placement="right"
          />
        </div>
      )}

      {/* Open button for right panel — anchored top-right inside the container */}
      {right && !right.open && right.openable && right.iconName && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            zIndex: 100,
            background: "#1e293b",
            borderRadius: "6px",
          }}
        >
          <ButtonIcon
            name={right.iconName}
            label="Open right panel"
            onClick={() => right.onOpen?.()}
            variant={right.variant}
            placement="left"
          />
        </div>
      )}
    </div>
  );
}
