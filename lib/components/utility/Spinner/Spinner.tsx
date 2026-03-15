import React from "react";

export interface SpinnerProps {
  /** Size in pixels. Defaults to 20. */
  size?: number;
  /** Color of the spinner arc. Defaults to "#3b82f6". */
  color?: string;
  /** Accessible label for screen readers. Defaults to "Loading". */
  label?: string;
}

export default function Spinner({
  size = 20,
  color = "#3b82f6",
  label = "Loading",
}: SpinnerProps) {
  const thickness = Math.max(2, Math.round(size * 0.12));
  const id = React.useId();
  const keyframeName = `spinner-spin-${id.replace(/:/g, "")}`;

  return (
    <span
      role="status"
      aria-label={label}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <style>{`
        @keyframes ${keyframeName} {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span
        style={{
          display: "block",
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${thickness}px solid rgba(255,255,255,0.15)`,
          borderTopColor: color,
          animation: `${keyframeName} 0.7s linear infinite`,
          flexShrink: 0,
        }}
      />
    </span>
  );
}
