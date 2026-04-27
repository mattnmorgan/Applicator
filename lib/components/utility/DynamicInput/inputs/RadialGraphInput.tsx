"use client";

import { useRef } from "react";
import type { DynamicInputProps } from "../DynamicInput";
import styles from "../DynamicInput.module.css";
import InputLabel from "../InputLabel";
import type { RadialGraphDimension } from "../types/radial-graph-dimension";

interface RadialDataSet {
  color: string;
  dims: Record<string, number>;
}

const SET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f97316",
  "#a855f7", "#06b6d4", "#eab308", "#ec4899",
  "#84cc16", "#14b8a6",
];

function parseSets(raw: unknown): RadialDataSet[] {
  if (Array.isArray(raw)) return raw as RadialDataSet[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as RadialDataSet[];
    } catch {}
  }
  return [];
}

function RadarChart({
  dimensions,
  sets,
  min,
  max,
}: {
  dimensions: RadialGraphDimension[];
  sets: RadialDataSet[];
  min: number;
  max: number;
}) {
  const N = dimensions.length;
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const R = 85;
  const labelR = R + 26;
  const RINGS = 4;

  function angle(i: number) {
    return (2 * Math.PI * i) / N - Math.PI / 2;
  }

  function polarPt(i: number, r: number): [number, number] {
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  }

  function normalize(v: number) {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (v - min) / (max - min)));
  }

  function toPoints(coords: [number, number][]) {
    return coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  }

  function ringPoints(fraction: number) {
    return toPoints(dimensions.map((_, i) => polarPt(i, R * fraction)));
  }

  function setPoints(set: RadialDataSet) {
    return toPoints(
      dimensions.map((d, i) => {
        const v = set.dims[d.abbr] ?? min;
        return polarPt(i, normalize(v) * R);
      })
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", margin: "0 auto", overflow: "visible" }}
    >
      {/* Concentric grid rings */}
      {Array.from({ length: RINGS }, (_, k) => (
        <polygon
          key={k}
          points={ringPoints((k + 1) / RINGS)}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {dimensions.map((d, i) => {
        const [x, y] = polarPt(i, R);
        return (
          <line
            key={d.abbr}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#334155"
            strokeWidth={1}
          />
        );
      })}

      {/* Data set polygons */}
      {sets.map((set, si) => (
        <polygon
          key={si}
          points={setPoints(set)}
          fill={set.color}
          fillOpacity={0.12}
          stroke={set.color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}

      {/* Data point dots */}
      {sets.map((set, si) =>
        dimensions.map((d, di) => {
          const v = set.dims[d.abbr] ?? min;
          const [x, y] = polarPt(di, normalize(v) * R);
          return (
            <circle key={`${si}-${di}`} cx={x} cy={y} r={3} fill={set.color} />
          );
        })
      )}

      {/* Axis labels (abbr with tooltip showing full label) */}
      {dimensions.map((d, i) => {
        const [lx, ly] = polarPt(i, labelR);
        return (
          <text
            key={d.abbr}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="600"
            fill="#94a3b8"
            style={{ cursor: "default", userSelect: "none" }}
          >
            <title>{d.label}</title>
            {d.abbr}
          </text>
        );
      })}
    </svg>
  );
}

export default function RadialGraphInput({
  input,
  value,
  onChange,
}: DynamicInputProps) {
  const dimensions: RadialGraphDimension[] = input.dimensions ?? [];
  const minVal = parseFloat(input.min ?? "0");
  const maxVal = parseFloat(input.max ?? "100");
  const sets = parseSets(value);
  const colorRefs = useRef<(HTMLInputElement | null)[]>([]);

  const disabled = input.disabled;

  function emit(newSets: RadialDataSet[]) {
    onChange(input.id, newSets);
  }

  function addSet() {
    const mid = (minVal + maxVal) / 2;
    const dims = Object.fromEntries(dimensions.map((d) => [d.abbr, mid]));
    const color = SET_COLORS[sets.length % SET_COLORS.length];
    emit([...sets, { color, dims }]);
  }

  function removeSet(index: number) {
    emit(sets.filter((_, i) => i !== index));
  }

  function updateColor(index: number, color: string) {
    emit(sets.map((s, i) => (i === index ? { ...s, color } : s)));
  }

  function updateDim(setIndex: number, abbr: string, val: number) {
    emit(
      sets.map((s, i) =>
        i === setIndex ? { ...s, dims: { ...s.dims, [abbr]: val } } : s
      )
    );
  }

  return (
    <div className={styles.wrapper}>
      <InputLabel input={input} />

      {dimensions.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: "13px", padding: "8px 0" }}>
          No dimensions configured. Provide a <code>dimensions</code> array on the input definition.
        </div>
      ) : (
        <>
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "12px 8px",
            }}
          >
            <RadarChart
              dimensions={dimensions}
              sets={sets}
              min={minVal}
              max={maxVal}
            />
          </div>

          {sets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              {sets.map((set, si) => (
                <div
                  key={si}
                  style={{
                    background: "#0f172a",
                    border: `1px solid ${set.color}55`,
                    borderRadius: "6px",
                    padding: "10px 12px",
                  }}
                >
                  {/* Set header: color swatch + label + remove */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        title="Click to change color"
                        disabled={disabled}
                        onClick={() => colorRefs.current[si]?.click()}
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          background: set.color,
                          border: "2px solid #475569",
                          cursor: disabled ? "not-allowed" : "pointer",
                          flexShrink: 0,
                          padding: 0,
                        }}
                      />
                      <input
                        type="color"
                        ref={(el) => { colorRefs.current[si] = el; }}
                        value={set.color}
                        onChange={(e) => updateColor(si, e.target.value)}
                        disabled={disabled}
                        style={{
                          position: "absolute",
                          opacity: 0,
                          width: 0,
                          height: 0,
                          pointerEvents: "none",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          fontFamily: "monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Set {si + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => removeSet(si)}
                      disabled={disabled}
                      title="Remove set"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontSize: "16px",
                        padding: "0 4px",
                        lineHeight: 1,
                        opacity: disabled ? 0.4 : 1,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Per-dimension sliders */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {dimensions.map((d) => {
                      const v = set.dims[d.abbr] ?? minVal;
                      const displayVal = Number.isInteger(v) ? v : parseFloat(v.toFixed(2));
                      return (
                        <div key={d.abbr} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              title={d.label}
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: set.color,
                                cursor: "default",
                                fontFamily: "monospace",
                              }}
                            >
                              {d.abbr}
                            </span>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {displayVal}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={minVal}
                            max={maxVal}
                            step={(maxVal - minVal) / 100 || 1}
                            value={v}
                            disabled={disabled}
                            onChange={(e) => updateDim(si, d.abbr, parseFloat(e.target.value))}
                            style={{
                              width: "100%",
                              accentColor: set.color,
                              cursor: disabled ? "not-allowed" : "pointer",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addSet}
            disabled={disabled}
            style={{
              marginTop: "8px",
              padding: "7px 14px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "6px",
              color: "#94a3b8",
              fontSize: "13px",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "background 0.15s",
              width: "100%",
              opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#334155"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1e293b"; }}
          >
            + Add Set
          </button>
        </>
      )}
    </div>
  );
}
