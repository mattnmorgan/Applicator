"use client";

import { useState, useRef, useCallback } from "react";
import ButtonIcon from "../ButtonIcon";
import Icon from "../Icon";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface FormColumn {
  id: string;
  width: number; // percentage, all cols in row sum to 100
  fieldId: string | null;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text", rich_text: "Rich Text", picklist: "Picklist",
  toggle: "Toggle", number: "Number", lookup: "Lookup",
};

// ─── FormEditor ───────────────────────────────────────────────────────────────

export default function FormEditor({ layout, fields, aliases, onChange }: FormEditorProps) {
  // Track which field is being dragged from the palette
  const draggingFieldId = useRef<string | null>(null);
  // Track which cell's fieldId is being dragged (for reordering within form)
  const draggingCellRef = useRef<{ sectionId: string; rowId: string; colId: string } | null>(null);

  const [fieldSearch, setFieldSearch] = useState("");
  const [dragOverCell, setDragOverCell] = useState<string | null>(null); // colId

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

  const setColumnField = (sId: string, rowId: string, colId: string, fieldId: string | null) => {
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
                        c.id === colId ? { ...c, fieldId } : c
                      ),
                    }
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
                        c.id === leftColId
                          ? { ...c, width: leftWidth }
                          : c.id === rightColId
                          ? { ...c, width: rightWidth }
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
      // From palette — set target, clear source if this field already existed elsewhere
      const fid = draggingFieldId.current;
      updateLayout((l) => {
        // First clear any existing assignment of this field
        const cleared = clearFieldFromLayout(l, fid);
        return applyFieldToCell(cleared, sId, rowId, colId, fid);
      });
    } else if (draggingCellRef.current) {
      // From another cell — swap
      const src = draggingCellRef.current;
      if (src.colId === colId) return; // same cell
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

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 12, height: "100%", minHeight: 0 }}>
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
              <span style={{ fontSize: 10, color: "#475569", flexShrink: 0 }}>{FIELD_TYPE_LABELS[f.fieldType]?.[0] ?? "?"}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "6px 8px", borderTop: "1px solid #1e293b", fontSize: 10, color: "#475569" }}>
          Drag to place in form
        </div>
      </div>

      {/* Layout canvas */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
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
            onClearCell={(rowId, colId) => setColumnField(sec.id, rowId, colId, null)}
            onResizeColumns={(rowId, lId, rId, lW, rW) => resizeColumns(sec.id, rowId, lId, rId, lW, rW)}
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
  );
}

// ─── SectionCanvas ─────────────────────────────────────────────────────────

function SectionCanvas({
  section, sectionIndex, totalSections, fields, aliases,
  dragOverCell, onSetDragOverCell,
  onRename, onRemove, onMoveUp, onMoveDown, onSetAliases,
  onAddRow, onRemoveRow, onCellDragStart, onCellDrop, onClearCell, onResizeColumns,
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
  onClearCell: (rowId: string, colId: string) => void;
  onResizeColumns: (rowId: string, lId: string, rId: string, lW: number, rW: number) => void;
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
            onClearCell={(colId) => onClearCell(row.id, colId)}
            onResizeColumns={(lId, rId, lW, rW) => onResizeColumns(row.id, lId, rId, lW, rW)}
          />
        ))}

        {/* Add row controls */}
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
  onRemoveRow, onCellDragStart, onCellDrop, onClearCell, onResizeColumns,
}: {
  row: FormRow;
  fields: FieldBadge[];
  dragOverCell: string | null;
  onSetDragOverCell: (id: string | null) => void;
  onRemoveRow: () => void;
  onCellDragStart: (colId: string) => void;
  onCellDrop: (colId: string, curFieldId: string | null) => void;
  onClearCell: (colId: string) => void;
  onResizeColumns: (lId: string, rId: string, lW: number, rW: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const startResize = (e: React.MouseEvent, lCol: FormColumn, rCol: FormColumn) => {
    e.preventDefault();
    const startX = e.clientX;
    const totalWidth = lCol.width + rCol.width;
    const rowEl = rowRef.current;
    if (!rowEl) return;
    const rowPx = rowEl.getBoundingClientRect().width;
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dpct = (dx / rowPx) * 100;
      const newLeft = Math.round(Math.max(10, Math.min(totalWidth - 10, lCol.width + dpct)));
      const newRight = totalWidth - newLeft;
      onResizeColumns(lCol.id, rCol.id, newLeft, newRight);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
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
                  flex: 1, minWidth: 0, minHeight: 44, padding: "6px 8px",
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
                    <span style={{ fontSize: 10, color: "#475569", flexShrink: 0 }}>{FIELD_TYPE_LABELS[field.fieldType]?.[0] ?? "?"}</span>
                    <button
                      onClick={() => onClearCell(col.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#475569", display: "flex", alignItems: "center", flexShrink: 0 }}
                      title="Clear cell"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                    >
                      <Icon name="close" size={10} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: "#334155" }}>empty</span>
                )}
              </div>

              {/* Resize handle (between columns) */}
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
      <button
        onClick={onRemoveRow}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "0 6px",
          color: "#334155", display: "flex", alignItems: "center", flexShrink: 0,
          transition: "color 0.12s",
        }}
        title="Remove row"
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
      >
        <Icon name="close" size={11} />
      </button>
    </div>
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

function getFieldInCell(layout: FormLayout, sId: string, rowId: string, colId: string): string | null {
  const sec = layout.sections.find((s) => s.id === sId);
  const row = sec?.rows.find((r) => r.id === rowId);
  const col = row?.columns.find((c) => c.id === colId);
  return col?.fieldId ?? null;
}
