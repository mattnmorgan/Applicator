"use client";

import { useState, useCallback } from "react";
import FormEditor from "@/lib/components/utility/FormEditor/FormEditor";
import FormViewer from "@/lib/components/utility/FormViewer/FormViewer";
import type { FormLayout, FieldBadge, AliasBadge, SerializedInputDef } from "@/lib/components/utility/FormEditor/FormEditor";
import type { FormViewerField } from "@/lib/components/utility/FormViewer/FormViewer";

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_ALIASES: AliasBadge[] = [
  { id: "alias-person", singularName: "Person", pluralName: "People", bgColor: "#1e3a5f", fgColor: "#60a5fa" },
  { id: "alias-company", singularName: "Company", pluralName: "Companies", bgColor: "#1a3a2a", fgColor: "#34d399" },
];

const SAMPLE_FIELDS: FieldBadge[] = [
  { id: "f-name", name: "Full Name", fieldType: "text" },
  { id: "f-email", name: "Email", fieldType: "text" },
  { id: "f-phone", name: "Phone", fieldType: "text" },
  { id: "f-age", name: "Age", fieldType: "number" },
  { id: "f-status", name: "Status", fieldType: "picklist" },
  { id: "f-active", name: "Active", fieldType: "toggle" },
  { id: "f-notes", name: "Notes", fieldType: "rich_text" },
  { id: "f-company", name: "Company", fieldType: "text" },
  { id: "f-revenue", name: "Annual Revenue", fieldType: "number" },
  { id: "f-industry", name: "Industry", fieldType: "picklist" },
];

const VIEWER_FIELDS: FormViewerField[] = SAMPLE_FIELDS.map((f) => ({
  id: f.id,
  name: f.name,
  fieldType: f.fieldType,
}));

const EMPTY_LAYOUT: FormLayout = { sections: [] };

const DEFAULT_VALUES: Record<string, any> = {
  "f-name": "Jane Smith",
  "f-email": "jane.smith@example.com",
  "f-phone": "+1 (555) 867-5309",
  "f-age": 34,
  "f-status": "active",
  "f-active": true,
  "f-notes": "Important client, follow up monthly.",
  "f-company": "Acme Corp",
  "f-revenue": 1500000,
  "f-industry": "technology",
};

function getDefaultInputDef(field: FieldBadge): SerializedInputDef | undefined {
  switch (field.fieldType) {
    case "text":
      return { type: "text", placeholder: `Enter ${field.name.toLowerCase()}…` };
    case "number":
      return { type: "number", placeholder: "0" };
    case "toggle":
      return { type: "toggle" };
    case "picklist":
      return {
        type: "select",
        options:
          field.id === "f-status"
            ? [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "pending", label: "Pending" },
              ]
            : field.id === "f-industry"
            ? [
                { value: "technology", label: "Technology" },
                { value: "finance", label: "Finance" },
                { value: "healthcare", label: "Healthcare" },
              ]
            : [],
      };
    case "rich_text":
      return { type: "richtext", lines: 3, resizable: true };
    default:
      return undefined;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActiveTab = "editor" | "viewer";

export default function TestFormEditorPage() {
  const [layout, setLayout] = useState<FormLayout>(EMPTY_LAYOUT);
  const [activeTab, setActiveTab] = useState<ActiveTab>("editor");
  const [editing, setEditing] = useState(true);
  const [activeAliasId, setActiveAliasId] = useState<string | undefined>(undefined);
  const [values, setValues] = useState<Record<string, any>>(DEFAULT_VALUES);

  const handleChange = useCallback((next: FormLayout) => setLayout(next), []);
  const handleValueChange = useCallback(
    (fieldId: string, value: any) => setValues((prev) => ({ ...prev, [fieldId]: value })),
    [],
  );

  const tabBtn = (tab: ActiveTab, label: string): React.CSSProperties => ({
    padding: "6px 16px",
    borderRadius: "6px",
    border: "1px solid",
    borderColor: activeTab === tab ? "#3b82f6" : "#334155",
    background: activeTab === tab ? "#1e3a5f" : "transparent",
    color: activeTab === tab ? "#60a5fa" : "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: activeTab === tab ? 600 : 400,
  });

  const toggleBtn = (active: boolean): React.CSSProperties => ({
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#f1f5f9", marginBottom: "8px" }}>
        Form Editor &amp; Viewer
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: "20px", fontSize: "14px" }}>
        Drag fields from the palette onto the canvas to build a form layout. Switch to the{" "}
        <strong style={{ color: "#f1f5f9" }}>Viewer</strong> tab to preview the result in view or edit mode.
      </p>

      {/* Tab bar + viewer controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <button style={tabBtn("editor", "Editor")} onClick={() => setActiveTab("editor")}>
          Editor
        </button>
        <button style={tabBtn("viewer", "Viewer")} onClick={() => setActiveTab("viewer")}>
          Viewer
        </button>

        {activeTab === "viewer" && (
          <>
            <span style={{ color: "#475569", marginLeft: "8px" }}>|</span>

            {/* Editing toggle */}
            <span style={{ color: "#64748b", fontSize: "13px" }}>Mode:</span>
            <button style={toggleBtn(editing)} onClick={() => setEditing(true)}>Edit</button>
            <button style={toggleBtn(!editing)} onClick={() => setEditing(false)}>View</button>

            {/* Alias selector */}
            <span style={{ color: "#475569", margin: "0 4px" }}>|</span>
            <span style={{ color: "#64748b", fontSize: "13px" }}>Alias:</span>
            <button
              style={toggleBtn(activeAliasId === undefined)}
              onClick={() => setActiveAliasId(undefined)}
            >
              None
            </button>
            {SAMPLE_ALIASES.map((a) => (
              <button
                key={a.id}
                style={toggleBtn(activeAliasId === a.id)}
                onClick={() => setActiveAliasId(a.id)}
              >
                {a.singularName}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {activeTab === "editor" ? (
          <div
            style={{
              height: "100%",
              border: "1px solid #334155",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <FormEditor
              layout={layout}
              fields={SAMPLE_FIELDS}
              aliases={SAMPLE_ALIASES}
              onChange={handleChange}
              getDefaultInputDef={getDefaultInputDef}
            />
          </div>
        ) : (
          <div
            style={{
              height: "100%",
              overflowY: "auto",
              padding: "20px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              boxSizing: "border-box",
            }}
          >
            {layout.sections.length === 0 ? (
              <p style={{ color: "#475569", fontSize: "14px", fontStyle: "italic" }}>
                No sections yet — switch to the Editor tab and build a layout first.
              </p>
            ) : (
              <FormViewer
                layout={layout}
                fields={VIEWER_FIELDS}
                activeAliasId={activeAliasId}
                editing={editing}
                values={values}
                onChange={handleValueChange}
                renderView={(field) => {
                  if (field.fieldType !== "rich_text") return undefined;
                  const html = values[field.id];
                  if (!html) return undefined;
                  return (
                    <div
                      dangerouslySetInnerHTML={{ __html: html }}
                      style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}
                    />
                  );
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
