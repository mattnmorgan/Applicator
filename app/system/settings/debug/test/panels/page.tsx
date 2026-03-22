"use client";

import { useState } from "react";
import DrawerLayout, { DrawerPanelConfig } from "@/lib/components/utility/DrawerLayout";

export default function TestPanelsPage() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftType, setLeftType] = useState<"inline" | "overlay">("inline");
  const [rightType, setRightType] = useState<"inline" | "overlay">("overlay");
  const [leftAnimated, setLeftAnimated] = useState(false);
  const [rightAnimated, setRightAnimated] = useState(true);
  const [leftWidth, setLeftWidth] = useState(25);
  const [rightWidth, setRightWidth] = useState(30);

  const leftPanel: DrawerPanelConfig = {
    open: leftOpen,
    type: leftType,
    width: leftWidth,
    closeable: true,
    title: "Left Panel",
    openable: true,
    iconName: "hamburger",
    variant: "bordered",
    animated: leftAnimated,
    onClose: () => setLeftOpen(false),
    onOpen: () => setLeftOpen(true),
    children: (
      <div style={{ color: "#94a3b8", fontSize: "14px" }}>
        <p style={{ marginBottom: "12px", color: "#f1f5f9", fontWeight: 600 }}>Left panel content</p>
        <p style={{ marginBottom: "8px" }}>This is the left panel. It can be used for navigation, filters, or any auxiliary content.</p>
        <p>Resize the window to see how it adapts on mobile screens.</p>
      </div>
    ),
  };

  const rightPanel: DrawerPanelConfig = {
    open: rightOpen,
    type: rightType,
    width: rightWidth,
    closeable: true,
    title: "Right Panel",
    openable: true,
    iconName: "settings",
    variant: "bordered",
    animated: rightAnimated,
    onClose: () => setRightOpen(false),
    onOpen: () => setRightOpen(true),
    children: (
      <div style={{ color: "#94a3b8", fontSize: "14px" }}>
        <p style={{ marginBottom: "12px", color: "#f1f5f9", fontWeight: 600 }}>Right panel content</p>
        <p>This panel could hold details, settings, or context-sensitive information.</p>
      </div>
    ),
  };

  const controlStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "12px",
  };

  const labelStyle: React.CSSProperties = {
    color: "#94a3b8",
    fontSize: "13px",
    width: "120px",
    flexShrink: 0,
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: "4px",
    border: "1px solid",
    borderColor: active ? "#3b82f6" : "#334155",
    background: active ? "#1e3a5f" : "transparent",
    color: active ? "#60a5fa" : "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
  });

  return (
    <div>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#f1f5f9",
          marginBottom: "8px",
        }}
      >
        Test Panels
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "14px" }}>
        Interactive demo of the <code style={{ color: "#60a5fa" }}>DrawerLayout</code> component. Configure
        panels below, then see them rendered in the preview. Use <strong style={{ color: "#f1f5f9" }}>animated</strong> to
        enable slide-in/out transitions on overlay panels, and <strong style={{ color: "#f1f5f9" }}>width</strong> to
        change the panel size.
      </p>

      {/* Controls */}
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <p style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: "16px", fontSize: "14px" }}>
          Configuration
        </p>

        <div style={controlStyle}>
          <span style={labelStyle}>Left panel</span>
          <button style={btnStyle(leftOpen)} onClick={() => setLeftOpen(!leftOpen)}>
            {leftOpen ? "Open" : "Closed"}
          </button>
          <button style={btnStyle(leftType === "inline")} onClick={() => setLeftType("inline")}>inline</button>
          <button style={btnStyle(leftType === "overlay")} onClick={() => setLeftType("overlay")}>overlay</button>
          <button style={btnStyle(leftAnimated)} onClick={() => setLeftAnimated(!leftAnimated)}>animated</button>
          <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "8px" }}>width:</span>
          <input
            type="number"
            value={leftWidth}
            onChange={(e) => setLeftWidth(Math.max(10, Math.min(60, Number(e.target.value))))}
            style={{ width: 48, padding: "2px 6px", borderRadius: "4px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "13px" }}
          />
          <span style={{ color: "#64748b", fontSize: "12px" }}>%</span>
        </div>

        <div style={controlStyle}>
          <span style={labelStyle}>Right panel</span>
          <button style={btnStyle(rightOpen)} onClick={() => setRightOpen(!rightOpen)}>
            {rightOpen ? "Open" : "Closed"}
          </button>
          <button style={btnStyle(rightType === "inline")} onClick={() => setRightType("inline")}>inline</button>
          <button style={btnStyle(rightType === "overlay")} onClick={() => setRightType("overlay")}>overlay</button>
          <button style={btnStyle(rightAnimated)} onClick={() => setRightAnimated(!rightAnimated)}>animated</button>
          <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "8px" }}>width:</span>
          <input
            type="number"
            value={rightWidth}
            onChange={(e) => setRightWidth(Math.max(10, Math.min(60, Number(e.target.value))))}
            style={{ width: 48, padding: "2px 6px", borderRadius: "4px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "13px" }}
          />
          <span style={{ color: "#64748b", fontSize: "12px" }}>%</span>
        </div>
      </div>

      {/* Preview */}
      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "8px" }}>Preview (400px tall):</p>
      <div
        style={{
          height: "400px",
          border: "1px solid #334155",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#0f172a",
        }}
      >
        <DrawerLayout leftPanel={leftPanel} rightPanel={rightPanel} style={{ height: "100%" }}>
          <div
            style={{
              padding: "24px",
              height: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <p style={{ color: "#f1f5f9", fontWeight: 600 }}>Center content</p>
            <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center" }}>
              This area resizes when inline panels are open, and stays full-width when overlay panels are open.
            </p>
          </div>
        </DrawerLayout>
      </div>
    </div>
  );
}
