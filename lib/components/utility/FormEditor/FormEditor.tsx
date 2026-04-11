"use client";

import { useState, useRef, useCallback } from "react";
import ButtonIcon from "../ButtonIcon";
import Icon from "../Icon";
import Modal from "../Modal";
import Button from "../Button";
import type { CustomInputType } from "@/lib/database/types/custom-input";
import type { DynamicInputOption } from "../DynamicInput/types/dynamic-input-option";

// ─── Shared types ────────────────────────────────────────────────────────────

/**
 * Serialisable subset of DynamicInputDefinition — no render functions.
 * Stored in each FormColumn so FormViewer can auto-render without callers
 * providing a renderEditor render-prop.
 */
export interface SerializedInputDef {
  type: CustomInputType;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: string;
  decimalPlaces?: number;
  format?: string;
  placeholder?: string;
  lines?: number;
  resizable?: boolean;
  options?: DynamicInputOption[];
  searchable?: boolean;
  tooltip?: string;
  /** Multi-select mode for searchable-combobox */
  multiSelect?: boolean;
}

export interface FormColumn {
  id: string;
  width: number; // percentage, all cols in row sum to 100
  fieldId: string | null;
  /** Stored DynamicInput configuration for this cell */
  inputDef?: SerializedInputDef;
}

export interface FormRow {
  id: string;
  columns: FormColumn[];
}

export interface FormLayoutSection {
  id: string;
  name: string;
  aliasIds: string[]; // empty = all aliases
  rows: FormRow[];
}

export interface FormLayout {
  sections: FormLayoutSection[];
}

export interface FieldBadge {
  id: string;
  name: string;
  fieldType: string;
}

export interface AliasBadge {
  id: string;
  singularName: string;
  pluralName: string;
  bgColor?: string;
  fgColor?: string;
}

export interface FormEditorProps {
  layout: FormLayout;
  fields: FieldBadge[];
  aliases: AliasBadge[];
  onChange: (layout: FormLayout) => void;
  /**
   * Called when a field is first dropped into a cell to produce a default
   * SerializedInputDef. If omitted or returns undefined, the cell starts
   * with no inputDef (FormViewer will fall back to renderEditor).
   */
  getDefaultInputDef?: (field: FieldBadge) => SerializedInputDef | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text", rich_text: "Rich Text", picklist: "Picklist",
  toggle: "Toggle", number: "Number", lookup: "Lookup",
};

const FIELD_TYPE_TO_INPUT_TYPE: Record<string, CustomInputType> = {
  text: "text",
  rich_text: "richtext",
  number: "number",
  toggle: "toggle",
  picklist: "badge-multiselect",
  lookup: "searchable-combobox",
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  text: "Text", number: "Number", password: "Password",
  date: "Date", datetime: "Date & Time", time: "Time",
  checkbox: "Checkbox", toggle: "Toggle", color: "Color",
  range: "Range", rangeslider: "Range Slider",
  select: "Select", multiselect: "Multi-select",
  radio: "Radio", "radio-horizontal-group": "Horizontal Radio",
  checklist: "Checklist", "badge-multiselect": "Badge Multi-select",
  "searchable-combobox": "Searchable Combobox",
  icon: "Icon", file: "File", richtext: "Rich Text",
  pseudoassignee: "Pseudoassignee", multipseudoassignee: "Multi Pseudoassignee",
};

const OPTION_TYPES = new Set([
  "select", "multiselect", "radio", "radio-horizontal-group",
  "checklist", "badge-multiselect", "searchable-combobox",
]);

const COLOR_OPTION_TYPES = new Set(["badge-multiselect", "radio-horizontal-group"]);

// ─── FormEditor ───────────────────────────────────────────────────────────────

export default function FormEditor({ layout, fields, aliases, onChange, getDefaultInputDef }: FormEditorProps) {
  const draggingFieldId = useRef<string | null>(null);
  const draggingCellRef = useRef<{ sectionId: string; rowId: string; colId: string } | null>(null);

  const [fieldSearch, setFieldSearch] = useState("");
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Cell config modal
  const [configCell, setConfigCell] = useState<{ sectionId: string; rowId: string; colId: string; fieldName: string; fieldType: string } | null>(null);
  const [configDraft, setConfigDraft] = useState<SerializedInputDef>({ type: "text" });

  const filteredFields = fields.filter((f) =>
    f.name.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  // ── layout mutators ────────────────────────────────────────────────────────

  const updateLayout = useCallback((updater: (l: FormLayout) => FormLayout) => {
    onChange(updater(layout));
  }, [layout, onChange]);

  const addSection = () => {
    updateLayout((l) => ({
      ...l,
      sections: [...l.sections, { id: newId(), name: "New Section", aliasIds: [], rows: [] }],
    }));
  };

  const removeSection = (sId: string) => {
    updateLayout((l) => ({ ...l, sections: l.sections.filter((s) => s.id !== sId) }));
  };

  const renameSection = (sId: string, name: string) => {
    updateLayout((l) => ({
      ...l,
      sections: l.sections.map((s) => s.id === sId ? { ...s, name } : s),
    }));
  };

  const setSectionAliases = (sId: string, aliasIds: string[]) => {
    updateLayout((l) => ({
      ...l,
      sections: l.sections.map((s) => s.id === sId ? { ...s, aliasIds } : s),
    }));
  };

  const addRow = (sId: string, colCount: number) => {
    const width = Math.floor(100 / colCount);
    const remainder = 100 - width * colCount;
    const columns: FormColumn[] = Array.from({ length: colCount }, (_, i) => ({
      id: newId(),
      width: i === colCount - 1 ? width + remainder : width,
      fieldId: null,
    }));
    updateLayout((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sId ? { ...s, rows: [...s.rows, { id: newId(), columns }] } : s
      ),
    }));
  };

  const removeRow = (sId: string, rowId: string) => {
    updateLayout((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sId ? { ...s, rows: s.rows.filter((r) => r.id !== rowId) } : s
      ),
    }));
  };

  const clearColumnField = (sId: string, rowId: string, colId: string) => {
    updateLayout((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sId
          ? {
              ...s,
              rows: s.rows.map((r) =>
                r.id === rowId
                  ? { ...r, columns: r.columns.map((c) => c.id === colId ? { ...c, fieldId: null, inputDef: undefined } : c) }
                  : r
              ),
            }
          : s
      ),
    }));
  };

  const setColumnInputDef = (sId: string, rowId: string, colId: string, inputDef: SerializedInputDef) => {
    updateLayout((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sId
          ? {
              ...s,
              rows: s.rows.map((r) =>
                r.id === rowId
                  ? { ...r, columns: r.columns.map((c) => c.id === colId ? { ...c, inputDef } : c) }
                  : r
              ),
            }
          : s
      ),
    }));
  };

  const resizeColumns = (sId: string, rowId: string, leftColId: string, rightColId: string, leftWidth: number, rightWidth: number) => {
    updateLayout((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sId
          ? {
              ...s,
              rows: s.rows.map((r) =>
                r.id === rowId
                  ? {
                      ...r,
                      columns: r.columns.map((c) =>
                        c.id === leftColId ? { ...c, width: leftWidth }
                        : c.id === rightColId ? { ...c, width: rightWidth }
                        : c
                      ),
                    }
                  : r
              ),
            }
          : s
      ),
    }));
  };

  // ── drag handlers ──────────────────────────────────────────────────────────

  const handlePaletteDragStart = (fieldId: string) => {
    draggingFieldId.current = fieldId;
    draggingCellRef.current = null;
  };

  const handleCellDragStart = (sId: string, rowId: string, colId: string) => {
    draggingCellRef.current = { sectionId: sId, rowId, colId };
    draggingFieldId.current = null;
  };

  const handleCellDrop = (sId: string, rowId: string, colId: string, currentFieldId: string | null) => {
    if (draggingFieldId.current !== null) {
      const fid = draggingFieldId.current;
      const field = fields.find((f) => f.id === fid);
      const defaultDef = field && getDefaultInputDef ? getDefaultInputDef(field) : undefined;
      updateLayout((l) => {
        const cleared = clearFieldFromLayout(l, fid);
        let next = applyFieldToCell(cleared, sId, rowId, colId, fid);
        if (defaultDef) next = applyInputDefToCell(next, sId, rowId, colId, defaultDef);
        return next;
      });
    } else if (draggingCellRef.current) {
      const src = draggingCellRef.current;
      if (src.colId === colId) return;
      const srcFieldId = getFieldInCell(layout, src.sectionId, src.rowId, src.colId);
      updateLayout((l) => {
        let next = applyFieldToCell(l, sId, rowId, colId, srcFieldId);
        next = applyFieldToCell(next, src.sectionId, src.rowId, src.colId, currentFieldId);
        return next;
      });
    }
    draggingFieldId.current = null;
    draggingCellRef.current = null;
    setDragOverCell(null);
  };

  // ── config modal ───────────────────────────────────────────────────────────

  const openConfig = (sId: string, rowId: string, colId: string, fieldName: string, fieldType: string, currentDef: SerializedInputDef | undefined) => {
    setConfigCell({ sectionId: sId, rowId, colId, fieldName, fieldType });
    const defaultType = FIELD_TYPE_TO_INPUT_TYPE[fieldType] ?? "text";
    setConfigDraft(currentDef ? { ...currentDef } : { type: defaultType });
  };

  const saveConfig = () => {
    if (!configCell) return;
    setColumnInputDef(configCell.sectionId, configCell.rowId, configCell.colId, configDraft);
    setConfigCell(null);
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Field palette */}
      <div style={{
        width: 200, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b", overflow: "hidden",
      }}>
        <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Fields</div>
          <input
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: "100%", background: "#1e293b", border: "1px solid #334155",
              borderRadius: 4, padding: "4px 7px", color: "#f1f5f9", fontSize: 12, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
          {filteredFields.length === 0 && (
            <div style={{ fontSize: 11, color: "#475569", padding: "4px 4px" }}>No fields</div>
          )}
          {filteredFields.map((f) => (
            <div
              key={f.id}
              draggable
              onDragStart={() => handlePaletteDragStart(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 7px", borderRadius: 5, background: "#1e293b",
                border: "1px solid #334155", cursor: "grab", userSelect: "none",
              }}
              title={FIELD_TYPE_LABELS[f.fieldType] || f.fieldType}
            >
              <span style={{ color: "#64748b", flexShrink: 0 }}><Icon name="drag" size={12} /></span>
              <span style={{ flex: 1, fontSize: 12, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ fontSize: 10, color: "#475569", background: "#1e293b", padding: "1px 5px", borderRadius: 3, flexShrink: 0, border: "1px solid #334155" }}>{FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "6px 8px", borderTop: "1px solid #1e293b", fontSize: 10, color: "#475569" }}>
          Drag to place in form
        </div>
      </div>

      {/* Layout canvas */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {layout.sections.length === 0 && (
            <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: 24 }}>
              No sections yet. Add a section to start building the form layout.
            </div>
          )}

          {layout.sections.map((sec, si) => (
            <SectionCanvas
              key={sec.id}
              section={sec}
              sectionIndex={si}
              totalSections={layout.sections.length}
              fields={fields}
              aliases={aliases}
              dragOverCell={dragOverCell}
              onSetDragOverCell={setDragOverCell}
              onRename={(name) => renameSection(sec.id, name)}
              onRemove={() => removeSection(sec.id)}
              onMoveUp={() => {
                if (si === 0) return;
                updateLayout((l) => {
                  const arr = [...l.sections];
                  [arr[si - 1], arr[si]] = [arr[si], arr[si - 1]];
                  return { ...l, sections: arr };
                });
              }}
              onMoveDown={() => {
                if (si === layout.sections.length - 1) return;
                updateLayout((l) => {
                  const arr = [...l.sections];
                  [arr[si], arr[si + 1]] = [arr[si + 1], arr[si]];
                  return { ...l, sections: arr };
                });
              }}
              onSetAliases={(ids) => setSectionAliases(sec.id, ids)}
              onAddRow={(cols) => addRow(sec.id, cols)}
              onRemoveRow={(rowId) => removeRow(sec.id, rowId)}
              onCellDragStart={(rowId, colId) => handleCellDragStart(sec.id, rowId, colId)}
              onCellDrop={(rowId, colId, curFieldId) => handleCellDrop(sec.id, rowId, colId, curFieldId)}
              onResizeColumns={(rowId, lId, rId, lW, rW) => resizeColumns(sec.id, rowId, lId, rId, lW, rW)}
              onOpenConfig={(rowId, colId, fieldName, fieldType, def) => openConfig(sec.id, rowId, colId, fieldName, fieldType, def)}
            />
          ))}

          <button
            onClick={addSection}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 16px", background: "transparent", border: "1px dashed #334155",
              borderRadius: 8, color: "#64748b", fontSize: 13, cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#93c5fd"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#64748b"; }}
          >
            <Icon name="plus" size={14} /> Add Section
          </button>
        </div>
      </div>

      {/* Cell config modal */}
      {configCell && (
        <Modal
          header={<span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>Configure Input — {configCell.fieldName}</span>}
          footer={
            <>
              <Button variant="danger" onClick={() => { clearColumnField(configCell.sectionId, configCell.rowId, configCell.colId); setConfigCell(null); }}>Clear cell</Button>
              <Button variant="secondary" onClick={() => setConfigCell(null)}>Cancel</Button>
              <Button variant="primary" onClick={saveConfig}>Save</Button>
            </>
          }
          closeable
          onClose={() => setConfigCell(null)}
          maxWidth={520}
        >
          <div style={{ padding: 16 }}>
            <CellConfigPanel draft={configDraft} onChange={setConfigDraft} fieldType={configCell.fieldType} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CellConfigPanel ──────────────────────────────────────────────────────────

function CellConfigPanel({ draft, onChange, fieldType }: { draft: SerializedInputDef; onChange: (d: SerializedInputDef) => void; fieldType: string }) {
  const set = (partial: Partial<SerializedInputDef>) => onChange({ ...draft, ...partial });

  const hasOptions = OPTION_TYPES.has(draft.type);
  const hasColorOptions = COLOR_OPTION_TYPES.has(draft.type);

  const addOption = () => {
    const opts = draft.options || [];
    set({ options: [...opts, { value: `option_${opts.length + 1}`, label: `Option ${opts.length + 1}` }] });
  };

  const updateOption = (i: number, partial: Partial<DynamicInputOption>) => {
    const opts = [...(draft.options || [])];
    opts[i] = { ...opts[i], ...partial };
    set({ options: opts });
  };

  const removeOption = (i: number) => {
    set({ options: (draft.options || []).filter((_, idx) => idx !== i) });
  };

  const moveOption = (i: number, dir: -1 | 1) => {
    const opts = [...(draft.options || [])];
    const j = i + dir;
    if (j < 0 || j >= opts.length) return;
    [opts[i], opts[j]] = [opts[j], opts[i]];
    set({ options: opts });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Input type (read-only, derived from field type) */}
      <div>
        <Label>Input Type</Label>
        <div style={{ fontSize: 12, color: "#94a3b8", padding: "5px 8px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 4 }}>
          {INPUT_TYPE_LABELS[draft.type] ?? draft.type}
          <span style={{ marginLeft: 6, fontSize: 11, color: "#475569" }}>({FIELD_TYPE_LABELS[fieldType] ?? fieldType} field)</span>
        </div>
      </div>

      {/* Common: placeholder */}
      {["text", "password", "number", "select", "multiselect", "searchable-combobox"].includes(draft.type) && (
        <div>
          <Label>Placeholder</Label>
          <input value={draft.placeholder || ""} onChange={(e) => set({ placeholder: e.target.value || undefined })} style={inputStyle} />
        </div>
      )}

      {/* Common: tooltip */}
      <div>
        <Label>Tooltip (optional)</Label>
        <input value={draft.tooltip || ""} onChange={(e) => set({ tooltip: e.target.value || undefined })} style={inputStyle} placeholder="Shown as a (?) indicator" />
      </div>

      {/* Text-specific */}
      {draft.type === "text" && (
        <>
          <Row2>
            <div>
              <Label>Lines</Label>
              <input type="number" min={1} value={draft.lines ?? 1} onChange={(e) => set({ lines: Number(e.target.value) || 1 })} style={inputStyle} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 2 }}>
              <CheckField label="Resizable" checked={!!draft.resizable} onChange={(v) => set({ resizable: v })} disabled={!draft.lines || draft.lines <= 1} />
            </div>
          </Row2>
        </>
      )}

      {/* Number / range / rangeslider */}
      {["number", "range", "rangeslider"].includes(draft.type) && (
        <Row2>
          <div>
            <Label>Min</Label>
            <input value={draft.min || ""} onChange={(e) => set({ min: e.target.value || undefined })} style={inputStyle} />
          </div>
          <div>
            <Label>Max</Label>
            <input value={draft.max || ""} onChange={(e) => set({ max: e.target.value || undefined })} style={inputStyle} />
          </div>
          <div>
            <Label>Step</Label>
            <input value={draft.step || ""} onChange={(e) => set({ step: e.target.value || undefined })} style={inputStyle} />
          </div>
          {draft.type === "number" && (
            <div>
              <Label>Decimal Places</Label>
              <input type="number" min={0} value={draft.decimalPlaces ?? ""} onChange={(e) => set({ decimalPlaces: e.target.value === "" ? undefined : Number(e.target.value) })} style={inputStyle} />
            </div>
          )}
        </Row2>
      )}

      {/* searchable-combobox: multiSelect toggle */}
      {draft.type === "searchable-combobox" && (
        <CheckField label="Multi-select" checked={!!draft.multiSelect} onChange={(v) => set({ multiSelect: v })} />
      )}

      {/* select/multiselect: searchable toggle */}
      {["select", "multiselect"].includes(draft.type) && (
        <CheckField label="Searchable dropdown" checked={!!draft.searchable} onChange={(v) => set({ searchable: v })} />
      )}

      {/* Options editor */}
      {hasOptions && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Label>Options</Label>
            <button onClick={addOption} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 12, cursor: "pointer", padding: 0 }}>+ Add</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(draft.options || []).map((opt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#0f172a", borderRadius: 4, padding: "4px 6px" }}>
                <ButtonIcon name="chevron-up" label="Move up" size="sm" onClick={() => moveOption(i, -1)} disabled={i === 0} />
                <ButtonIcon name="chevron-down" label="Move down" size="sm" onClick={() => moveOption(i, 1)} disabled={i === (draft.options?.length ?? 0) - 1} />
                <input
                  value={opt.value}
                  onChange={(e) => updateOption(i, { value: e.target.value })}
                  placeholder="value"
                  title="Option value (stored)"
                  style={{ ...inputStyle, flex: "0 0 90px", fontSize: 11 }}
                />
                <input
                  value={opt.label}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                  placeholder="label"
                  title="Option label (displayed)"
                  style={{ ...inputStyle, flex: 1, minWidth: 0, fontSize: 11 }}
                />
                {hasColorOptions && (
                  <>
                    <input type="color" value={opt.selectedColor || "#3b82f6"} onChange={(e) => updateOption(i, { selectedColor: e.target.value })} title="Selected background color" style={{ width: 26, height: 26, border: "1px solid #334155", borderRadius: 3, background: "transparent", cursor: "pointer", flexShrink: 0 }} />
                    {draft.type === "badge-multiselect" && (
                      <input type="color" value={opt.fgColor || "#ffffff"} onChange={(e) => updateOption(i, { fgColor: e.target.value })} title="Selected text color" style={{ width: 26, height: 26, border: "1px solid #334155", borderRadius: 3, background: "transparent", cursor: "pointer", flexShrink: 0 }} />
                    )}
                  </>
                )}
                <ButtonIcon name="trash" label="Remove option" subvariant="danger" size="sm" onClick={() => removeOption(i)} />
              </div>
            ))}
            {(draft.options || []).length === 0 && (
              <div style={{ fontSize: 11, color: "#475569", padding: "4px 6px" }}>No options yet. Click + Add to create one.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 500 }}>{children}</div>;
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function CheckField({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ cursor: "inherit" }} />
      <span style={{ fontSize: 12, color: "#e2e8f0" }}>{label}</span>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#0f172a", border: "1px solid #334155", borderRadius: 4,
  padding: "5px 8px", color: "#f1f5f9", fontSize: 12, outline: "none",
};


// ─── SectionCanvas ─────────────────────────────────────────────────────────

function SectionCanvas({
  section, sectionIndex, totalSections, fields, aliases,
  dragOverCell, onSetDragOverCell,
  onRename, onRemove, onMoveUp, onMoveDown, onSetAliases,
  onAddRow, onRemoveRow, onCellDragStart, onCellDrop, onResizeColumns, onOpenConfig,
}: {
  section: FormLayoutSection;
  sectionIndex: number;
  totalSections: number;
  fields: FieldBadge[];
  aliases: AliasBadge[];
  dragOverCell: string | null;
  onSetDragOverCell: (id: string | null) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetAliases: (ids: string[]) => void;
  onAddRow: (cols: number) => void;
  onRemoveRow: (rowId: string) => void;
  onCellDragStart: (rowId: string, colId: string) => void;
  onCellDrop: (rowId: string, colId: string, curFieldId: string | null) => void;
  onResizeColumns: (rowId: string, lId: string, rId: string, lW: number, rW: number) => void;
  onOpenConfig: (rowId: string, colId: string, fieldName: string, fieldType: string, def: SerializedInputDef | undefined) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(section.name);

  return (
    <div style={{ background: "#1e293b", borderRadius: 8, overflow: "hidden", border: "1px solid #334155" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderBottom: "1px solid #334155", background: "#162032" }}>
        <ButtonIcon name="chevron-up" label="Move up" size="sm" onClick={onMoveUp} disabled={sectionIndex === 0} />
        <ButtonIcon name="chevron-down" label="Move down" size="sm" onClick={onMoveDown} disabled={sectionIndex === totalSections - 1} />
        {editingName ? (
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") { onRename(nameDraft); setEditingName(false); }
                if (e.key === "Escape") setEditingName(false);
              }}
              style={{ flex: 1, background: "#0f172a", border: "1px solid #3b82f6", borderRadius: 4, padding: "3px 7px", color: "#f1f5f9", fontSize: 13, outline: "none" }}
            />
            <ButtonIcon name="check" label="Save" size="sm" onClick={() => { onRename(nameDraft); setEditingName(false); }} />
            <ButtonIcon name="close" label="Cancel" size="sm" onClick={() => setEditingName(false)} />
          </div>
        ) : (
          <span
            style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#f1f5f9", cursor: "pointer" }}
            onClick={() => { setNameDraft(section.name); setEditingName(true); }}
          >
            {section.name}
          </span>
        )}
        <ButtonIcon name="trash" label="Remove section" subvariant="danger" size="sm" onClick={onRemove} />
      </div>

      {/* Alias restriction */}
      {aliases.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderBottom: "1px solid #0f172a", background: "#111827", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>Visible for:</span>
          <span
            onClick={() => onSetAliases([])}
            style={{
              padding: "2px 8px", borderRadius: 999, fontSize: 11, cursor: "pointer",
              background: section.aliasIds.length === 0 ? "#3b82f6" : "#0f172a",
              color: section.aliasIds.length === 0 ? "#fff" : "#94a3b8",
              border: `1px solid ${section.aliasIds.length === 0 ? "#3b82f6" : "#334155"}`,
            }}
          >All</span>
          {aliases.map((a) => {
            const sel = section.aliasIds.includes(a.id);
            return (
              <span
                key={a.id}
                onClick={() => {
                  const cur = section.aliasIds;
                  onSetAliases(sel ? cur.filter((id) => id !== a.id) : [...cur, a.id]);
                }}
                style={{
                  padding: "2px 8px", borderRadius: 999, fontSize: 11, cursor: "pointer",
                  background: sel ? (a.bgColor || "#3b82f6") : "#0f172a",
                  color: sel ? (a.fgColor || "#fff") : "#94a3b8",
                  border: `1px solid ${sel ? (a.bgColor || "#3b82f6") : "#334155"}`,
                }}
              >{a.pluralName}</span>
            );
          })}
        </div>
      )}

      {/* Rows */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {section.rows.map((row) => (
          <RowCanvas
            key={row.id}
            row={row}
            fields={fields}
            dragOverCell={dragOverCell}
            onSetDragOverCell={onSetDragOverCell}
            onRemoveRow={() => onRemoveRow(row.id)}
            onCellDragStart={(colId) => onCellDragStart(row.id, colId)}
            onCellDrop={(colId, curFieldId) => onCellDrop(row.id, colId, curFieldId)}
            onResizeColumns={(lId, rId, lW, rW) => onResizeColumns(row.id, lId, rId, lW, rW)}
            onOpenConfig={(colId, fieldName, fieldType, def) => onOpenConfig(row.id, colId, fieldName, fieldType, def)}
          />
        ))}

        <div style={{ display: "flex", gap: 4, alignItems: "center", paddingTop: section.rows.length > 0 ? 4 : 0 }}>
          <span style={{ fontSize: 11, color: "#475569", marginRight: 2 }}>Add row:</span>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => onAddRow(n)}
              style={{
                padding: "3px 8px", borderRadius: 4, background: "#0f172a", border: "1px solid #334155",
                color: "#94a3b8", fontSize: 11, cursor: "pointer", transition: "all 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#93c5fd"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}
              title={`Add row with ${n} column${n > 1 ? "s" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RowCanvas ──────────────────────────────────────────────────────────────

function RowCanvas({
  row, fields, dragOverCell, onSetDragOverCell,
  onRemoveRow, onCellDragStart, onCellDrop, onResizeColumns, onOpenConfig,
}: {
  row: FormRow;
  fields: FieldBadge[];
  dragOverCell: string | null;
  onSetDragOverCell: (id: string | null) => void;
  onRemoveRow: () => void;
  onCellDragStart: (colId: string) => void;
  onCellDrop: (colId: string, curFieldId: string | null) => void;
  onResizeColumns: (lId: string, rId: string, lW: number, rW: number) => void;
  onOpenConfig: (colId: string, fieldName: string, fieldType: string, def: SerializedInputDef | undefined) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [resizePopover, setResizePopover] = useState<{ x: number; y: number; left: number; right: number } | null>(null);

  const startResize = (e: React.MouseEvent, lCol: FormColumn, rCol: FormColumn) => {
    e.preventDefault();
    const startX = e.clientX;
    const totalWidth = lCol.width + rCol.width;
    const rowEl = rowRef.current;
    if (!rowEl) return;
    const rowPx = rowEl.getBoundingClientRect().width;
    const rowTop = rowEl.getBoundingClientRect().top;
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dpct = (dx / rowPx) * 100;
      const newLeft = Math.round(Math.max(10, Math.min(totalWidth - 10, lCol.width + dpct)));
      const newRight = totalWidth - newLeft;
      onResizeColumns(lCol.id, rCol.id, newLeft, newRight);
      setResizePopover({ x: me.clientX, y: rowTop - 8, left: newLeft, right: newRight });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setResizePopover(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <>
    {resizePopover && (
      <div style={{
        position: "fixed",
        left: resizePopover.x,
        top: resizePopover.y,
        transform: "translate(-50%, -100%)",
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 4,
        padding: "3px 8px",
        fontSize: 11,
        color: "#93c5fd",
        pointerEvents: "none",
        zIndex: 9999,
        whiteSpace: "nowrap",
      }}>
        {resizePopover.left} | {resizePopover.right}
      </div>
    )}
    <div style={{ display: "flex", alignItems: "stretch", gap: 0, background: "#0f172a", borderRadius: 6, overflow: "hidden", border: "1px solid #1e293b", position: "relative" }}>
      <div ref={rowRef} style={{ display: "flex", flex: 1, minWidth: 0 }}>
        {row.columns.map((col, ci) => {
          const field = fields.find((f) => f.id === col.fieldId);
          const isDragOver = dragOverCell === col.id;
          const nextCol = row.columns[ci + 1];
          return (
            <div key={col.id} style={{ display: "flex", alignItems: "stretch", width: `${col.width}%`, minWidth: 0 }}>
              {/* Cell */}
              <div
                onDragOver={(e) => { e.preventDefault(); onSetDragOverCell(col.id); }}
                onDragLeave={() => onSetDragOverCell(null)}
                onDrop={(e) => { e.preventDefault(); onCellDrop(col.id, col.fieldId); onSetDragOverCell(null); }}
                style={{
                  flex: 1, minWidth: 0, minHeight: 34, padding: "4px 8px",
                  background: isDragOver ? "#1e3a5f" : "transparent",
                  border: isDragOver ? "1px dashed #3b82f6" : "1px dashed transparent",
                  borderRadius: 4, transition: "background 0.1s, border-color 0.1s",
                  display: "flex", alignItems: "center", gap: 6,
                  cursor: field ? "grab" : "default",
                }}
                draggable={!!field}
                onDragStart={() => field && onCellDragStart(col.id)}
              >
                {field ? (
                  <>
                    <span style={{ color: "#64748b", flexShrink: 0 }}><Icon name="drag" size={11} /></span>
                    <span style={{ flex: 1, fontSize: 12, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.name}</span>
                    <ButtonIcon
                      name="settings"
                      label="Configure input"
                      size="sm"
                      onClick={() => { onOpenConfig(col.id, field.name, field.fieldType, col.inputDef); }}
                    />
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: "#334155" }}>empty</span>
                )}
              </div>

              {/* Resize handle */}
              {nextCol && (
                <div
                  onMouseDown={(e) => startResize(e, col, nextCol)}
                  style={{
                    width: 6, flexShrink: 0, cursor: "col-resize", background: "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  title="Drag to resize columns"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Remove row */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 2px", flexShrink: 0 }}>
        <ButtonIcon name="close" label="Remove row" size="sm" subvariant="danger" onClick={onRemoveRow} />
      </div>
    </div>
    </>
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clearFieldFromLayout(layout: FormLayout, fieldId: string): FormLayout {
  return {
    ...layout,
    sections: layout.sections.map((s) => ({
      ...s,
      rows: s.rows.map((r) => ({
        ...r,
        columns: r.columns.map((c) => (c.fieldId === fieldId ? { ...c, fieldId: null } : c)),
      })),
    })),
  };
}

function applyFieldToCell(
  layout: FormLayout, sId: string, rowId: string, colId: string, fieldId: string | null
): FormLayout {
  return {
    ...layout,
    sections: layout.sections.map((s) =>
      s.id === sId
        ? {
            ...s,
            rows: s.rows.map((r) =>
              r.id === rowId
                ? { ...r, columns: r.columns.map((c) => (c.id === colId ? { ...c, fieldId } : c)) }
                : r
            ),
          }
        : s
    ),
  };
}

function applyInputDefToCell(
  layout: FormLayout, sId: string, rowId: string, colId: string, inputDef: SerializedInputDef
): FormLayout {
  return {
    ...layout,
    sections: layout.sections.map((s) =>
      s.id === sId
        ? {
            ...s,
            rows: s.rows.map((r) =>
              r.id === rowId
                ? { ...r, columns: r.columns.map((c) => (c.id === colId ? { ...c, inputDef } : c)) }
                : r
            ),
          }
        : s
    ),
  };
}

function getFieldInCell(layout: FormLayout, sId: string, rowId: string, colId: string): string | null {
  const sec = layout.sections.find((s) => s.id === sId);
  const row = sec?.rows.find((r) => r.id === rowId);
  const col = row?.columns.find((c) => c.id === colId);
  return col?.fieldId ?? null;
}
