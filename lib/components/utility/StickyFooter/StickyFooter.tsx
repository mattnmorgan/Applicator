import React from "react";

export interface StickyFooterProps {
  children: React.ReactNode;
  /** Pixels to extend beyond the parent's padding on each side (to reach edge-to-edge). */
  bleed?: number;
}

export default function StickyFooter({ children, bleed = 0 }: StickyFooterProps) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        background: "#1e293b",
        borderTop: "1px solid #334155",
        padding: `12px ${20 + bleed}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        flexShrink: 0,
        marginTop: "auto",
        marginLeft: bleed ? -bleed : undefined,
        marginRight: bleed ? -bleed : undefined,
        marginBottom: bleed ? -bleed : undefined,
      }}
    >
      {children}
    </div>
  );
}
