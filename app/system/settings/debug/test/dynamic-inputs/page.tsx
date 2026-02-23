"use client";

import { useState, useRef, useEffect } from "react";
import DynamicInput from "@/lib/components/utility/DynamicInput";
import type { DynamicInputDefinition } from "@/lib/components/utility/DynamicInput";

const SAMPLE_INPUTS: DynamicInputDefinition[] = [
  {
    id: "demo-select",
    label: "Favorite Fruit",
    type: "select",
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
      { value: "mango", label: "Mango" },
    ],
  },
  {
    id: "demo-multiselect",
    label: "Programming Languages",
    type: "multiselect",
    options: [
      { value: "ts", label: "TypeScript" },
      { value: "py", label: "Python" },
      { value: "rs", label: "Rust" },
      { value: "go", label: "Go" },
      { value: "java", label: "Java" },
    ],
  },
  {
    id: "demo-radio",
    label: "Priority Level",
    type: "radio",
    options: [
      { value: "low", label: "Low", description: "Non-urgent tasks" },
      { value: "medium", label: "Medium", description: "Normal priority" },
      { value: "high", label: "High", description: "Urgent, needs attention" },
    ],
  },
  {
    id: "demo-pseudoassignee",
    label: "Assign To",
    type: "pseudoassignee",
    options: [
      { value: "alice", label: "Alice", description: "Frontend Lead" },
      { value: "bob", label: "Bob", description: "Backend Engineer" },
      { value: "carol", label: "Carol", description: "Designer" },
    ],
  },
  {
    id: "demo-multipseudoassignee",
    label: "Reviewers",
    type: "multipseudoassignee",
    options: [
      { value: "alice", label: "Alice", description: "Frontend Lead" },
      { value: "bob", label: "Bob", description: "Backend Engineer" },
      { value: "carol", label: "Carol", description: "Designer" },
      { value: "dave", label: "Dave", description: "QA Engineer" },
    ],
  },
  {
    id: "demo-checkbox",
    label: "Enable notifications",
    type: "checkbox",
  },
  {
    id: "demo-text",
    label: "Description",
    type: "text",
  },
  {
    id: "demo-date",
    label: "Due Date",
    type: "date",
    format: "YYYY-MM-DD",
  },
  {
    id: "demo-datetime",
    label: "Event Start",
    type: "datetime",
    format: "YYYY-MM-DD HH:mm",
  },
  {
    id: "demo-time",
    label: "Reminder Time",
    type: "time",
    format: "HH:mm",
  },
  {
    id: "demo-number",
    label: "Quantity",
    type: "number",
    min: "0",
    max: "1000",
    decimalPlaces: 0,
  },
  {
    id: "demo-range",
    label: "Volume",
    type: "range",
    min: "0",
    max: "100",
    step: "5",
  },
  {
    id: "demo-rangeslider",
    label: "Opacity",
    type: "rangeslider",
    min: "0",
    max: "100",
    step: "1",
  },
  {
    id: "demo-color",
    label: "Theme Color",
    type: "color",
    defaultValue: "#3b82f6",
  },
  {
    id: "demo-checklist",
    label: "To-Do List",
    type: "checklist",
  },
  {
    id: "demo-icon",
    label: "Avatar",
    type: "icon",
  },
  {
    id: "demo-file",
    label: "Attachment",
    type: "file",
  },
  {
    id: "demo-password",
    label: "Password",
    type: "password",
  },
];

interface SettingsState {
  [inputId: string]: Partial<DynamicInputDefinition>;
}

function InputSettingsModal({
  input,
  onClose,
  onApply,
}: {
  input: DynamicInputDefinition;
  onClose: () => void;
  onApply: (updates: Partial<DynamicInputDefinition>) => void;
}) {
  const [label, setLabel] = useState(input.label);
  const [required, setRequired] = useState(input.required || false);
  const [disabled, setDisabled] = useState(input.disabled || false);
  const [min, setMin] = useState(input.min || "");
  const [max, setMax] = useState(input.max || "");
  const [step, setStep] = useState(input.step || "");
  const [decimalPlaces, setDecimalPlaces] = useState(
    input.decimalPlaces !== undefined ? String(input.decimalPlaces) : "",
  );
  const [format, setFormat] = useState(input.format || "");
  const [defaultValue, setDefaultValue] = useState(input.defaultValue || "");
  const [placeholder, setPlaceholder] = useState(input.placeholder || "");
  const [searchable, setSearchable] = useState(input.searchable || false);
  const [lines, setLines] = useState(
    input.lines !== undefined ? String(input.lines) : "",
  );
  const [resizable, setResizable] = useState(input.resizable !== false);

  const showMinMax = ["number", "range", "rangeslider"].includes(input.type);
  const showStep = ["range", "rangeslider"].includes(input.type);
  const showDecimal = input.type === "number";
  const showFormat = ["date", "datetime", "time"].includes(input.type);
  const showPlaceholder = [
    "text", "number", "select", "multiselect",
    "pseudoassignee", "multipseudoassignee", "password",
  ].includes(input.type);
  const showSearchable = [
    "select", "multiselect", "pseudoassignee", "multipseudoassignee",
  ].includes(input.type);
  const showLines = input.type === "text";
  const showResizable = input.type === "text" && parseInt(lines) > 1;

  function handleApply() {
    const updates: Partial<DynamicInputDefinition> = { label, required, disabled, defaultValue };
    if (showMinMax) {
      updates.min = min || undefined;
      updates.max = max || undefined;
    }
    if (showStep) {
      updates.step = step || undefined;
    }
    if (showDecimal) {
      updates.decimalPlaces = decimalPlaces ? parseInt(decimalPlaces) : undefined;
    }
    if (showFormat) {
      updates.format = format || undefined;
    }
    if (showPlaceholder) {
      updates.placeholder = placeholder || undefined;
    }
    if (showSearchable) {
      updates.searchable = searchable || undefined;
    }
    if (showLines) {
      updates.lines = lines ? parseInt(lines) : undefined;
    }
    if (showResizable) {
      updates.resizable = resizable;
    }
    onApply(updates);
    onClose();
  }

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: 500,
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "4px",
    color: "#f1f5f9",
    fontSize: "13px",
    outline: "none",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "20px",
          width: "400px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            color: "#f1f5f9",
            fontSize: "16px",
          }}
        >
          Settings: {input.label}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Label</label>
            <input
              style={inputStyle}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Default Value</label>
            <input
              style={inputStyle}
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              style={{ accentColor: "#3b82f6" }}
            />
            <span style={{ color: "#f1f5f9", fontSize: "13px" }}>Required</span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              style={{ accentColor: "#3b82f6" }}
            />
            <span style={{ color: "#f1f5f9", fontSize: "13px" }}>Disabled</span>
          </label>

          {showSearchable && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={searchable}
                onChange={(e) => setSearchable(e.target.checked)}
                style={{ accentColor: "#3b82f6" }}
              />
              <span style={{ color: "#f1f5f9", fontSize: "13px" }}>Searchable</span>
            </label>
          )}

          {showPlaceholder && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Placeholder</label>
              <input
                style={inputStyle}
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Enter placeholder text..."
              />
            </div>
          )}

          {showLines && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Lines</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                placeholder="1 (single-line input)"
              />
            </div>
          )}

          {showResizable && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={resizable}
                onChange={(e) => setResizable(e.target.checked)}
                style={{ accentColor: "#3b82f6" }}
              />
              <span style={{ color: "#f1f5f9", fontSize: "13px" }}>Resizable</span>
            </label>
          )}

          {showMinMax && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Min</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Max</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </div>
            </>
          )}

          {showStep && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Step</label>
              <input
                style={inputStyle}
                type="number"
                value={step}
                onChange={(e) => setStep(e.target.value)}
              />
            </div>
          )}

          {showDecimal && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Decimal Places</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="10"
                value={decimalPlaces}
                onChange={(e) => setDecimalPlaces(e.target.value)}
              />
            </div>
          )}

          {showFormat && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Format</label>
              <input
                style={inputStyle}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="e.g. YYYY-MM-DD"
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#334155",
              border: "1px solid #475569",
              borderRadius: "6px",
              color: "#f1f5f9",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DynamicInputsTestPage() {
  const [values, setValues] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [settingsOverrides, setSettingsOverrides] = useState<SettingsState>({});
  const [editingInput, setEditingInput] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  function handleChange(id: string, value: any) {
    setValues((prev) => ({ ...prev, [id]: value }));
    const display =
      typeof value === "object" ? JSON.stringify(value) : String(value ?? "null");
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] Input "${id}" changed to: ${display}`]);
  }

  function getInput(base: DynamicInputDefinition): DynamicInputDefinition {
    const overrides = settingsOverrides[base.id];
    if (!overrides) return base;
    return { ...base, ...overrides };
  }

  function handleApplySettings(
    inputId: string,
    updates: Partial<DynamicInputDefinition>,
  ) {
    setSettingsOverrides((prev) => ({
      ...prev,
      [inputId]: { ...prev[inputId], ...updates },
    }));
  }

  const editingDef = editingInput
    ? getInput(SAMPLE_INPUTS.find((i) => i.id === editingInput)!)
    : null;

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
        Dynamic Inputs Test
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "14px" }}>
        Test all dynamic input types. Click the gear icon to customize settings
        for each input. Value changes are logged below.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {SAMPLE_INPUTS.map((base) => {
          const input = getInput(base);
          return (
            <div
              key={base.id}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  {input.type}
                </span>
                <button
                  onClick={() => setEditingInput(base.id)}
                  title="Settings"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    fontSize: "16px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#64748b";
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
              <DynamicInput
                input={input}
                value={values[base.id] ?? input.defaultValue ?? undefined}
                onChange={handleChange}
              />
            </div>
          );
        })}
      </div>

      <div>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#f1f5f9",
            marginBottom: "8px",
          }}
        >
          Event Log
        </h2>
        <div
          ref={logRef}
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "12px",
            height: "200px",
            overflowY: "auto",
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: "13px",
            color: "#94a3b8",
          }}
        >
          {logs.length === 0 && (
            <div style={{ color: "#475569" }}>
              Change input values to see events here...
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: "2px" }}>
              {log}
            </div>
          ))}
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => setLogs([])}
            style={{
              marginTop: "8px",
              padding: "6px 12px",
              background: "#334155",
              border: "1px solid #475569",
              borderRadius: "4px",
              color: "#94a3b8",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Clear Log
          </button>
        )}
      </div>

      {editingDef && (
        <InputSettingsModal
          input={editingDef}
          onClose={() => setEditingInput(null)}
          onApply={(updates) => handleApplySettings(editingInput!, updates)}
        />
      )}
    </div>
  );
}
