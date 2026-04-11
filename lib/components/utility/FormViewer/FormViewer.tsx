"use client";

import DynamicInput from "../DynamicInput";
import InfoTooltip from "../InfoTooltip";
import type { DynamicInputDefinition } from "../DynamicInput/types/dynamic-input-definition";
import { type FormLayout, type FormLayoutSection, type FormRow, type FormColumn, type SerializedInputDef } from "../FormEditor/FormEditor";

export type { FormLayout, FormLayoutSection, FormRow, FormColumn, SerializedInputDef };

export interface FormViewerField {
  id: string;
  name: string;
  fieldType: string;
  aliasIds?: string[];
  required?: boolean;
  tooltip?: string;
}

export interface FormViewerProps {
  layout: FormLayout;
  fields: FormViewerField[];
  /** The currently selected alias ID for this record (or undefined for none) */
  activeAliasId?: string;
  /** editing mode — if false, renderView is used; if true, renderEditor */
  editing: boolean;

  // ── DynamicInput-based rendering ─────────────────────────────────────────
  /** Current field values keyed by field ID. Required for DynamicInput rendering. */
  values?: Record<string, any>;
  /** Called when a DynamicInput-rendered field changes. */
  onChange?: (fieldId: string, value: any) => void;
  /**
   * Merge additional/dynamic props into the stored inputDef at render time
   * (e.g. inject current picklist options from a DB field config).
   * The returned partial is spread on top of the stored inputDef, with
   * dynamic values winning (so dynamic options override stored ones).
   */
  resolveInputDef?: (field: FormViewerField) => Partial<DynamicInputDefinition>;

  // ── Render-prop fallback / custom override ────────────────────────────────
  /** Render a field value in view mode. Used when no inputDef is stored, or as
   *  an override for types that need custom view rendering (e.g. lookup, richtext). */
  renderView?: (field: FormViewerField) => React.ReactNode;
  /** Render a field editor in edit mode. Used when no inputDef is stored, or as
   *  an override for types that need custom edit rendering (e.g. lookup). */
  renderEditor?: (field: FormViewerField) => React.ReactNode;
}

/**
 * FormViewer renders a FormLayout, respecting alias restrictions per section
 * and per field. When a column has a stored `inputDef`, it auto-renders via
 * DynamicInput. Render props are used as fallback or custom override.
 */
export default function FormViewer({
  layout,
  fields,
  activeAliasId,
  editing,
  values,
  onChange,
  resolveInputDef,
  renderView,
  renderEditor,
}: FormViewerProps) {
  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  const visibleSections = layout.sections.filter((sec) => {
    if (sec.aliasIds.length === 0) return true;
    return activeAliasId ? sec.aliasIds.includes(activeAliasId) : false;
  });

  if (visibleSections.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {visibleSections.map((sec) => {
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
                  values={values}
                  onChange={onChange}
                  resolveInputDef={resolveInputDef}
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
  row, fieldMap, activeAliasId, editing,
  values, onChange, resolveInputDef, renderView, renderEditor,
}: {
  row: FormRow;
  fieldMap: Map<string, FormViewerField>;
  activeAliasId?: string;
  editing: boolean;
  values?: Record<string, any>;
  onChange?: (fieldId: string, value: any) => void;
  resolveInputDef?: (field: FormViewerField) => Partial<DynamicInputDefinition>;
  renderView?: (field: FormViewerField) => React.ReactNode;
  renderEditor?: (field: FormViewerField) => React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {row.columns.map((col) => {
        const field = col.fieldId ? fieldMap.get(col.fieldId) : null;
        const visible = field
          ? (!field.aliasIds || field.aliasIds.length === 0 || (activeAliasId ? field.aliasIds.includes(activeAliasId) : false))
          : false;

        return (
          <div key={col.id} style={{ flex: `${col.width}`, minWidth: 0 }}>
            {visible && field ? (
              <FieldCell
                col={col}
                field={field}
                editing={editing}
                values={values}
                onChange={onChange}
                resolveInputDef={resolveInputDef}
                renderView={renderView}
                renderEditor={renderEditor}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FieldCell({
  col, field, editing,
  values, onChange, resolveInputDef, renderView, renderEditor,
}: {
  col: FormColumn;
  field: FormViewerField;
  editing: boolean;
  values?: Record<string, any>;
  onChange?: (fieldId: string, value: any) => void;
  resolveInputDef?: (field: FormViewerField) => Partial<DynamicInputDefinition>;
  renderView?: (field: FormViewerField) => React.ReactNode;
  renderEditor?: (field: FormViewerField) => React.ReactNode;
}) {
  // Build the full DynamicInputDefinition for this cell if inputDef is stored
  const inputDef = buildInputDef(col.inputDef, field, resolveInputDef);

  const fieldLabel = (
    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
      <span>
        {field.name}
        {field.required && editing && <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>}
      </span>
      {field.tooltip && <InfoTooltip text={field.tooltip} />}
    </div>
  );

  if (editing) {
    // 1. Try render-prop override first (for custom types like lookup)
    const customEditor = renderEditor?.(field);
    if (customEditor !== null && customEditor !== undefined) {
      return (
        <div>
          {fieldLabel}
          <div style={{ fontSize: 13, color: "#e2e8f0" }}>{customEditor}</div>
        </div>
      );
    }
    // 2. Auto-render via DynamicInput if inputDef is available
    if (inputDef && values !== undefined && onChange) {
      return (
        <DynamicInput
          input={inputDef}
          value={values[field.id] ?? getDefaultValue(inputDef)}
          onChange={(_, v) => onChange(field.id, v)}
        />
      );
    }
    return null;
  }

  // View mode
  const value = values?.[field.id];

  // 1. Try render-prop override first
  const customView = renderView?.(field);
  if (customView !== null && customView !== undefined) {
    return (
      <div>
        {fieldLabel}
        <div style={{ fontSize: 13, color: "#e2e8f0" }}>{customView}</div>
      </div>
    );
  }

  // 2. Auto-render default view if inputDef is available
  if (inputDef) {
    const defaultView = renderDefaultView(value, inputDef);
    if (defaultView !== null) {
      return (
        <div>
          {fieldLabel}
          <div style={{ fontSize: 13, color: "#e2e8f0" }}>{defaultView}</div>
        </div>
      );
    }
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInputDef(
  stored: SerializedInputDef | undefined,
  field: FormViewerField,
  resolveInputDef?: (field: FormViewerField) => Partial<DynamicInputDefinition>,
): DynamicInputDefinition | null {
  if (!stored) return null;
  const extra = resolveInputDef?.(field) || {};
  return {
    id: field.id,
    label: field.name,
    required: field.required,
    tooltip: field.tooltip,
    ...stored,
    ...extra,
  } as DynamicInputDefinition;
}

function getDefaultValue(inputDef: DynamicInputDefinition): any {
  const type = inputDef.type;
  if (type === "toggle" || type === "checkbox") return false;
  if (type === "multiselect" || type === "checklist" || type === "badge-multiselect") return [];
  if (type === "searchable-combobox") return (inputDef as any).multiSelect ? [] : "";
  return "";
}

function renderDefaultView(value: any, inputDef: DynamicInputDefinition): React.ReactNode {
  const type = inputDef.type;
  const empty = <span style={{ color: "#64748b" }}>—</span>;

  if (type === "toggle" || type === "checkbox") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 32, height: 18, borderRadius: 9,
          background: value ? "#3b82f6" : "#334155",
          position: "relative", flexShrink: 0,
        }}>
          <div style={{
            position: "absolute",
            top: 2, left: value ? 14 : 2,
            width: 14, height: 14, borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }} />
        </div>
      </div>
    );
  }

  if (value === undefined || value === null || value === "") return empty;

  if (type === "color") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: 3, background: String(value), border: "1px solid #334155" }} />
        <span>{String(value)}</span>
      </div>
    );
  }

  if (type === "select" || type === "radio" || type === "radio-horizontal-group") {
    const opt = inputDef.options?.find((o) => o.value === value);
    return <span>{opt?.label || String(value)}</span>;
  }

  if (type === "multiselect" || type === "checklist" || type === "badge-multiselect") {
    const vals = Array.isArray(value) ? value : (value ? [value] : []);
    if (vals.length === 0) return empty;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {vals.map((v: string) => {
          const opt = inputDef.options?.find((o) => o.value === v);
          return (
            <span key={v} style={{ background: "#334155", borderRadius: 4, padding: "2px 6px", fontSize: 12, color: "#e2e8f0" }}>
              {opt?.label || v}
            </span>
          );
        })}
      </div>
    );
  }

  if (type === "searchable-combobox") {
    const isMulti = !!(inputDef as any).multiSelect;
    if (isMulti) {
      const vals = Array.isArray(value) ? value : (value ? [value] : []);
      if (vals.length === 0) return empty;
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {vals.map((v: string) => {
            const opt = inputDef.options?.find((o) => o.value === v);
            return (
              <span key={v} style={{ background: "#334155", borderRadius: 4, padding: "2px 6px", fontSize: 12, color: "#e2e8f0" }}>
                {opt?.label || v}
              </span>
            );
          })}
        </div>
      );
    }
    const opt = inputDef.options?.find((o) => o.value === value);
    return <span>{opt?.label || String(value)}</span>;
  }

  if (type === "range") {
    if (Array.isArray(value) && value.length === 2) return <span>{value[0]} – {value[1]}</span>;
  }

  // richtext: caller must handle via renderView (we can't render HTML safely here)
  if (type === "richtext") return null;

  if (Array.isArray(value) && value.length === 0) return empty;

  return <span>{String(value)}</span>;
}
