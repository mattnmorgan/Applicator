"use client";

import { type FormLayout, type FormLayoutSection, type FormRow, type FormColumn } from "../FormEditor/FormEditor";

export type { FormLayout, FormLayoutSection, FormRow, FormColumn };

export interface FormViewerField {
  id: string;
  name: string;
  fieldType: string;
  aliasIds?: string[];
}

export interface FormViewerProps {
  layout: FormLayout;
  fields: FormViewerField[];
  /** The currently selected alias ID for this record (or undefined for none) */
  activeAliasId?: string;
  /** editing mode — if false, renderView is used; if true, renderEditor */
  editing: boolean;
  /** Render a field value in view mode */
  renderView: (field: FormViewerField) => React.ReactNode;
  /** Render a field editor in edit mode */
  renderEditor: (field: FormViewerField) => React.ReactNode;
}

/**
 * FormViewer renders a FormLayout, respecting alias restrictions per section
 * and per field. It uses render props for the actual field content so it stays
 * data-agnostic and can be used for any entry type.
 */
export default function FormViewer({
  layout,
  fields,
  activeAliasId,
  editing,
  renderView,
  renderEditor,
}: FormViewerProps) {
  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  const visibleSections = layout.sections.filter((sec) => {
    if (sec.aliasIds.length === 0) return true;
    return activeAliasId ? sec.aliasIds.includes(activeAliasId) : false;
  });

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {visibleSections.map((sec) => {
        // Collect all non-empty cells in this section that have visible fields
        const hasContent = sec.rows.some((row) =>
          row.columns.some((col) => {
            if (!col.fieldId) return false;
            const field = fieldMap.get(col.fieldId);
            if (!field) return false;
            if (field.aliasIds && field.aliasIds.length > 0) {
              if (!activeAliasId || !field.aliasIds.includes(activeAliasId)) return false;
            }
            return true;
          })
        );
        if (!hasContent && !editing) return null;

        return (
          <div key={sec.id}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10,
            }}>
              {sec.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sec.rows.map((row) => (
                <FormViewerRow
                  key={row.id}
                  row={row}
                  fieldMap={fieldMap}
                  activeAliasId={activeAliasId}
                  editing={editing}
                  renderView={renderView}
                  renderEditor={renderEditor}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FormViewerRow({
  row, fieldMap, activeAliasId, editing, renderView, renderEditor,
}: {
  row: FormRow;
  fieldMap: Map<string, FormViewerField>;
  activeAliasId?: string;
  editing: boolean;
  renderView: (field: FormViewerField) => React.ReactNode;
  renderEditor: (field: FormViewerField) => React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {row.columns.map((col) => {
        const field = col.fieldId ? fieldMap.get(col.fieldId) : null;
        const visible = field
          ? (!field.aliasIds || field.aliasIds.length === 0 || (activeAliasId ? field.aliasIds.includes(activeAliasId) : false))
          : false;

        return (
          <div key={col.id} style={{ width: `${col.width}%`, minWidth: 0, flexShrink: 0 }}>
            {visible && field ? (
              <div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{field.name}</div>
                <div style={{ fontSize: 13, color: "#e2e8f0" }}>
                  {editing ? renderEditor(field) : renderView(field)}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
