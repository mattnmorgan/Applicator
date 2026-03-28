"use client";

import React, { useRef, useEffect, useState } from "react";
import Icon from "../Icon";

// ---- Style injection ----
const RTE_STYLE_ID = "applicator-rte-styles";
const RTE_STYLES = `
.rte-content ul, .rte-editor ul { list-style-type: disc; padding-left: 1.5em; margin: 4px 0; }
.rte-content ol, .rte-editor ol { list-style-type: decimal; padding-left: 1.5em; margin: 4px 0; }
.rte-content li, .rte-editor li { margin: 2px 0; }
.rte-content a, .rte-editor a { color: #60a5fa; text-decoration: underline; }
.rte-content a:hover, .rte-editor a:hover { color: #93c5fd; }
.rte-content p, .rte-editor p { margin: 0; }
.rte-content table, .rte-editor table { border-collapse: collapse; margin: 6px 0; }
.rte-content td, .rte-editor td, .rte-content th, .rte-editor th { border: 1px solid #475569; padding: 5px 10px; min-width: 60px; }
.rte-content th, .rte-editor th { background-color: #1e293b; font-weight: 600; }
.rte-content img, .rte-editor img { max-width: 100%; height: auto; display: inline-block; }
.rte-editor img.rte-img-selected { outline: 2px solid #3b82f6; outline-offset: 1px; }
`;

function injectRteStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(RTE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = RTE_STYLE_ID;
  style.textContent = RTE_STYLES;
  document.head.appendChild(style);
}

if (typeof document !== "undefined") {
  injectRteStyles();
}

// ---- RichTextViewer ----

export interface RichTextViewerProps {
  html: string;
  style?: React.CSSProperties;
}

export function RichTextViewer({ html, style }: RichTextViewerProps) {
  return (
    <div
      className="rte-content"
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---- TbBtn ----

function TbBtn({
  tip,
  style,
  onAction,
  children,
  setTooltip,
}: {
  tip: string;
  style: React.CSSProperties;
  onAction: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  setTooltip: (v: { text: string; x: number; y: number } | null) => void;
}) {
  return (
    <button
      title={tip}
      style={style}
      onMouseDown={(e) => {
        e.preventDefault();
        setTooltip(null);
        onAction(e);
      }}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTooltip({ text: tip, x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setTooltip(null)}
    >
      {children}
    </button>
  );
}

// ---- RichTextEditor ----

export interface RichTextEditorProps {
  /** HTML string value */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height of the editable area in pixels or a CSS string. Default: 80 */
  minHeight?: number | string;
  /**
   * Maximum number of visible lines before the editor scrolls.
   * Computed as `maxLines * 1.6em + 16px` (lineHeight 1.6, 8px top+bottom padding).
   * Default: 5.
   */
  maxLines?: number;
  disabled?: boolean;
}

const CELL_STYLE =
  "border: 1px solid #475569; padding: 5px 10px; min-width: 60px;";

type ImgHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "se" | "sw";

// ---- Color palette ----

const PALETTE: string[] = [
  // Neutrals
  "#000000", "#1e293b", "#475569", "#64748b",
  "#94a3b8", "#cbd5e1", "#f1f5f9", "#ffffff",
  // Colors
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  // Extra
  "#7f1d1d", "#92400e", "#365314", "#0c4a6e",
  "#581c87", "#831843", "#78350f", "#134e4a",
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 80,
  maxLines = 5,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const hlInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const colorPopupRef = useRef<HTMLDivElement>(null);
  const colorSavedRange = useRef<Range | null>(null);
  const hlSavedRange = useRef<Range | null>(null);
  const bgSavedRange = useRef<Range | null>(null);
  const bgSavedCell = useRef<HTMLTableCellElement | null>(null);
  const linkSavedRange = useRef<Range | null>(null);
  const lastEmitted = useRef(value || "");
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    heightWasAuto: boolean;
    handle: ImgHandle;
  } | null>(null);
  const colDragRef = useRef<{
    table: HTMLTableElement;
    colIdx: number;
    startX: number;
    tableW: number;
    leftPct: number;
    rightPct: number;
  } | null>(null);

  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    superscript: false,
    subscript: false,
    insertOrderedList: false,
    insertUnorderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });
  const [colorPopup, setColorPopup] = useState<{
    type: "font" | "highlight" | "bg";
    x: number;
    y: number;
  } | null>(null);
  const [isEmpty, setIsEmpty] = useState(
    !(value || "").replace(/<[^>]*>/g, "").trim(),
  );
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [inTable, setInTable] = useState(false);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgOverlay, setImgOverlay] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [colResizeCursor, setColResizeCursor] = useState(false);
  const [editorBg, setEditorBg] = useState("");

  // Mount: set initial content
  useEffect(() => {
    const el = editorRef.current;
    if (el) {
      el.innerHTML = value || "";
      lastEmitted.current = value || "";
      setIsEmpty(!(el.textContent || "").trim());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when value changes externally
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const normalized = value || "";
    if (normalized !== lastEmitted.current) {
      el.innerHTML = normalized;
      lastEmitted.current = normalized;
      setIsEmpty(!(el.textContent || "").trim());
    }
  }, [value]);

  // Deselect image when clicking outside the editor
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (
        editorWrapRef.current &&
        !editorWrapRef.current.contains(e.target as Node)
      ) {
        deselectImage();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure image overlay on editor scroll
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    function onScroll() {
      if (selectedImgRef.current) measureImg(selectedImgRef.current);
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close color popup on outside click
  useEffect(() => {
    if (!colorPopup) return;
    function onDown(e: MouseEvent) {
      if (
        colorPopupRef.current &&
        !colorPopupRef.current.contains(e.target as Node)
      ) {
        setColorPopup(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorPopup]);

  // ---- Table context ----

  function getTableContext(): {
    td: HTMLTableCellElement | null;
    tr: HTMLTableRowElement | null;
    table: HTMLTableElement | null;
  } | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    let td: HTMLTableCellElement | null = null;
    let tr: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName === "TD" || el.tagName === "TH")
          td = el as HTMLTableCellElement;
        if (el.tagName === "TR") tr = el as HTMLTableRowElement;
        if (el.tagName === "TABLE") {
          table = el as HTMLTableElement;
          break;
        }
      }
      node = node.parentNode;
    }
    return table ? { td, tr, table } : null;
  }

  // ---- Format state ----

  function refreshFormats() {
    setFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      superscript: document.queryCommandState("superscript"),
      subscript: document.queryCommandState("subscript"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
    });
    setInTable(!!getTableContext());
  }

  function emitChange() {
    const el = editorRef.current;
    if (!el) return;
    const hasText = !!(el.textContent || "").trim();
    const hasVisual = hasText || !!el.querySelector("img, table");
    const emitted = hasVisual ? el.innerHTML : "";
    setIsEmpty(!hasVisual);
    lastEmitted.current = emitted;
    onChange(emitted);
    refreshFormats();
  }

  function exec(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
    emitChange();
  }

  // ---- Image helpers ----

  function measureImg(img: HTMLImageElement) {
    const wrap = editorWrapRef.current;
    if (!img || !wrap) return;
    const wRect = wrap.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    setImgOverlay({
      top: iRect.top - wRect.top,
      left: iRect.left - wRect.left,
      width: iRect.width,
      height: iRect.height,
    });
  }

  function selectImage(img: HTMLImageElement) {
    editorRef.current
      ?.querySelectorAll(".rte-img-selected")
      .forEach((el) => el.classList.remove("rte-img-selected"));
    img.classList.add("rte-img-selected");
    selectedImgRef.current = img;
    setSelectedImg(img);
    measureImg(img);
  }

  function deselectImage() {
    editorRef.current
      ?.querySelectorAll(".rte-img-selected")
      .forEach((el) => el.classList.remove("rte-img-selected"));
    selectedImgRef.current = null;
    setSelectedImg(null);
    setImgOverlay(null);
  }

  function compressAndInsertImage(file: Blob) {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 800;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_W) {
        h = Math.round((h * MAX_W) / w);
        w = MAX_W;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      editorRef.current?.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${dataUrl}" style="max-width:100%;height:auto;" />`,
      );
      emitChange();
    };
    img.src = url;
  }

  // ---- Image drag resize (8-direction) ----

  function startImgDrag(e: React.MouseEvent, handle: ImgHandle) {
    const img = selectedImgRef.current;
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = img.getBoundingClientRect();
    const heightWasAuto = !img.style.height || img.style.height === "auto";
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      heightWasAuto,
      handle,
    };

    function onMove(ev: MouseEvent) {
      const drag = dragRef.current;
      const target = selectedImgRef.current;
      if (!drag || !target) return;
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      const h = drag.handle;

      let newW = drag.startW;
      let newH = drag.startH;

      if (h === "e" || h === "ne" || h === "se")
        newW = Math.max(20, drag.startW + dx);
      if (h === "w" || h === "nw" || h === "sw")
        newW = Math.max(20, drag.startW - dx);
      if (h === "s" || h === "se" || h === "sw")
        newH = Math.max(20, drag.startH + dy);
      if (h === "n" || h === "ne" || h === "nw")
        newH = Math.max(20, drag.startH - dy);

      target.style.width = `${newW}px`;
      if (h === "e" || h === "w") {
        // Width-only: restore original height behavior
        target.style.height = drag.heightWasAuto ? "auto" : `${drag.startH}px`;
      } else {
        target.style.height = `${newH}px`;
      }

      // Update overlay directly for smooth drag
      const wrap = editorWrapRef.current;
      const ov = overlayRef.current;
      if (wrap && ov) {
        const wRect = wrap.getBoundingClientRect();
        const iRect = target.getBoundingClientRect();
        ov.style.left = `${iRect.left - wRect.left}px`;
        ov.style.top = `${iRect.top - wRect.top}px`;
        ov.style.width = `${iRect.width}px`;
        ov.style.height = `${iRect.height}px`;
      }
    }

    function onUp() {
      dragRef.current = null;
      const target = selectedImgRef.current;
      if (target) measureImg(target);
      emitChange();
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const makeHandle = (h: ImgHandle) => (e: React.MouseEvent) =>
    startImgDrag(e, h);

  function handleStyle(handle: ImgHandle): React.CSSProperties {
    const base: React.CSSProperties = {
      position: "absolute",
      width: 8,
      height: 8,
      background: "#3b82f6",
      border: "1px solid #fff",
      borderRadius: "2px",
      zIndex: 10,
      pointerEvents: "all",
    };
    switch (handle) {
      case "nw":
        return { ...base, cursor: "nw-resize", top: -4, left: -4 };
      case "n":
        return { ...base, cursor: "n-resize", top: -4, left: "calc(50% - 4px)" };
      case "ne":
        return { ...base, cursor: "ne-resize", top: -4, right: -4 };
      case "e":
        return { ...base, cursor: "e-resize", right: -4, top: "calc(50% - 4px)" };
      case "se":
        return { ...base, cursor: "se-resize", bottom: -4, right: -4 };
      case "s":
        return { ...base, cursor: "s-resize", bottom: -4, left: "calc(50% - 4px)" };
      case "sw":
        return { ...base, cursor: "sw-resize", bottom: -4, left: -4 };
      case "w":
        return { ...base, cursor: "w-resize", left: -4, top: "calc(50% - 4px)" };
    }
  }

  // ---- Column resize ----

  function findColResizeTarget(
    e: React.MouseEvent,
  ): { table: HTMLTableElement; colIdx: number } | null {
    const target = e.target as HTMLElement;
    const cell = target.closest
      ? (target.closest("td, th") as HTMLTableCellElement | null)
      : null;
    if (!cell || !editorRef.current?.contains(cell)) return null;
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return null;
    const table = row.closest("table") as HTMLTableElement | null;
    if (!table) return null;
    const rect = cell.getBoundingClientRect();
    const x = e.clientX;
    const colIdx = Array.from(row.cells).indexOf(cell);

    if (Math.abs(x - rect.right) <= 5 && colIdx < row.cells.length - 1) {
      return { table, colIdx };
    }
    if (Math.abs(x - rect.left) <= 5 && colIdx > 0) {
      return { table, colIdx: colIdx - 1 };
    }
    return null;
  }

  function startColResize(
    table: HTMLTableElement,
    colIdx: number,
    startX: number,
  ) {
    const tableW = table.getBoundingClientRect().width;
    const firstRow = table.rows[0];
    if (!firstRow || colIdx + 1 >= firstRow.cells.length) return;

    // Measure rendered column widths
    const colWidths: number[] = [];
    for (let i = 0; i < firstRow.cells.length; i++) {
      colWidths.push(firstRow.cells[i].getBoundingClientRect().width);
    }

    // Set table to fixed layout with 100% width so % columns are respected
    table.style.tableLayout = "fixed";
    if (!table.style.width) table.style.width = "100%";

    // Set all cells to percentage widths
    for (const row of Array.from(table.rows)) {
      for (let i = 0; i < row.cells.length; i++) {
        const cell = row.cells[i] as HTMLTableCellElement;
        const pct =
          colWidths[i] !== undefined
            ? (colWidths[i] / tableW) * 100
            : 100 / firstRow.cells.length;
        cell.style.width = `${pct.toFixed(2)}%`;
      }
    }

    const leftPct = (colWidths[colIdx] / tableW) * 100;
    const rightPct = (colWidths[colIdx + 1] / tableW) * 100;
    colDragRef.current = { table, colIdx, startX, tableW, leftPct, rightPct };

    function onMove(ev: MouseEvent) {
      const drag = colDragRef.current;
      if (!drag) return;
      const dx = ev.clientX - drag.startX;
      const dPct = (dx / drag.tableW) * 100;
      const minPct = 3;
      const newLeft = Math.max(
        minPct,
        Math.min(drag.leftPct + drag.rightPct - minPct, drag.leftPct + dPct),
      );
      const newRight = drag.leftPct + drag.rightPct - newLeft;
      for (const row of Array.from(drag.table.rows)) {
        const lc = row.cells[drag.colIdx] as HTMLTableCellElement | undefined;
        const rc = row.cells[drag.colIdx + 1] as
          | HTMLTableCellElement
          | undefined;
        if (lc) lc.style.width = `${newLeft.toFixed(2)}%`;
        if (rc) rc.style.width = `${newRight.toFixed(2)}%`;
      }
    }

    function onUp() {
      colDragRef.current = null;
      setColResizeCursor(false);
      emitChange();
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleEditorMouseMove(e: React.MouseEvent) {
    if (colDragRef.current) return;
    setColResizeCursor(!!findColResizeTarget(e));
  }

  function handleEditorMouseDown(e: React.MouseEvent) {
    const hit = findColResizeTarget(e);
    if (hit) {
      e.preventDefault();
      startColResize(hit.table, hit.colIdx, e.clientX);
    }
  }

  // ---- Font size ----

  function changeFontSize(delta: 1 | -1) {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const container = sel.getRangeAt(0).commonAncestorContainer;
    const elem = (
      container.nodeType === Node.ELEMENT_NODE
        ? container
        : container.parentElement
    ) as HTMLElement | null;
    const curPx =
      parseFloat(
        window.getComputedStyle(elem || editorRef.current!).fontSize,
      ) || 13;
    const newPx = Math.max(8, Math.min(72, curPx + delta * 2));
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((fe) => {
      const el = fe as HTMLElement;
      el.removeAttribute("size");
      el.style.fontSize = `${newPx}px`;
    });
    emitChange();
  }

  // ---- Table operations ----

  function insertTable() {
    const rows = Math.max(1, parseInt(tableRows) || 3);
    const cols = Math.max(1, parseInt(tableCols) || 3);
    const colPct = (100 / cols).toFixed(2);
    let html = `<table style="border-collapse:collapse;margin:6px 0;width:100%;table-layout:fixed;"><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="${CELL_STYLE}width:${colPct}%;">&nbsp;</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    emitChange();
    setShowTablePopup(false);
  }

  function deleteTable() {
    const ctx = getTableContext();
    if (!ctx?.table) return;
    ctx.table.remove();
    emitChange();
  }

  function insertRowAbove() {
    const ctx = getTableContext();
    if (!ctx?.tr) return;
    const cols = ctx.tr.cells.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < cols; i++) {
      const cell = document.createElement("td");
      cell.setAttribute("style", CELL_STYLE);
      cell.innerHTML = "&nbsp;";
      newRow.appendChild(cell);
    }
    ctx.tr.parentNode?.insertBefore(newRow, ctx.tr);
    emitChange();
  }

  function insertRowBelow() {
    const ctx = getTableContext();
    if (!ctx?.tr) return;
    const cols = ctx.tr.cells.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < cols; i++) {
      const cell = document.createElement("td");
      cell.setAttribute("style", CELL_STYLE);
      cell.innerHTML = "&nbsp;";
      newRow.appendChild(cell);
    }
    ctx.tr.parentNode?.insertBefore(newRow, ctx.tr.nextSibling);
    emitChange();
  }

  function deleteRow() {
    const ctx = getTableContext();
    if (!ctx?.tr || !ctx.table) return;
    const tbody = ctx.tr.parentElement;
    ctx.tr.remove();
    if (tbody && tbody.querySelectorAll("tr").length === 0) ctx.table.remove();
    emitChange();
  }

  function getCellColIndex(td: HTMLTableCellElement): number {
    return Array.from(
      (td.parentElement as HTMLTableRowElement)?.cells ?? [],
    ).indexOf(td);
  }

  function rebalanceColumns(table: HTMLTableElement) {
    const numCols = table.rows[0]?.cells.length;
    if (!numCols) return;
    const pct = (100 / numCols).toFixed(2);
    table.style.tableLayout = "fixed";
    table.style.width = "100%";
    for (const row of Array.from(table.rows)) {
      for (let i = 0; i < row.cells.length; i++) {
        (row.cells[i] as HTMLTableCellElement).style.width = `${pct}%`;
      }
    }
  }

  function insertColLeft() {
    const ctx = getTableContext();
    if (!ctx?.td || !ctx.table) return;
    const colIdx = getCellColIndex(ctx.td);
    for (const row of ctx.table.rows) {
      const cell = document.createElement("td");
      cell.setAttribute("style", CELL_STYLE);
      cell.innerHTML = "&nbsp;";
      const ref = row.cells[colIdx];
      if (ref) row.insertBefore(cell, ref);
      else row.appendChild(cell);
    }
    rebalanceColumns(ctx.table);
    emitChange();
  }

  function insertColRight() {
    const ctx = getTableContext();
    if (!ctx?.td || !ctx.table) return;
    const colIdx = getCellColIndex(ctx.td);
    for (const row of ctx.table.rows) {
      const cell = document.createElement("td");
      cell.setAttribute("style", CELL_STYLE);
      cell.innerHTML = "&nbsp;";
      const ref = row.cells[colIdx + 1];
      if (ref) row.insertBefore(cell, ref);
      else row.appendChild(cell);
    }
    rebalanceColumns(ctx.table);
    emitChange();
  }

  function deleteCol() {
    const ctx = getTableContext();
    if (!ctx?.td || !ctx.table) return;
    const colIdx = getCellColIndex(ctx.td);
    let empty = false;
    for (const row of ctx.table.rows) {
      if (row.cells[colIdx]) row.deleteCell(colIdx);
      if (row.cells.length === 0) empty = true;
    }
    if (empty) ctx.table.remove();
    else rebalanceColumns(ctx.table);
    emitChange();
  }

  function toggleHeaderRow() {
    const ctx = getTableContext();
    if (!ctx?.tr) return;
    const isHeader = Array.from(ctx.tr.cells).every((c) => c.tagName === "TH");
    const newTag = isHeader ? "td" : "th";
    Array.from(ctx.tr.cells).forEach((cell) => {
      const newCell = document.createElement(newTag);
      newCell.setAttribute("style", CELL_STYLE);
      newCell.innerHTML = cell.innerHTML;
      ctx.tr!.replaceChild(newCell, cell);
    });
    emitChange();
  }

  function toggleHeaderCol() {
    const ctx = getTableContext();
    if (!ctx?.td || !ctx.table) return;
    const colIdx = getCellColIndex(ctx.td);
    const cells = Array.from(ctx.table.rows)
      .map((row) => row.cells[colIdx])
      .filter(Boolean) as HTMLTableCellElement[];
    const isHeader = cells.every((c) => c.tagName === "TH");
    const newTag = isHeader ? "td" : "th";
    cells.forEach((cell) => {
      const newCell = document.createElement(newTag);
      newCell.setAttribute("style", CELL_STYLE);
      newCell.innerHTML = cell.innerHTML;
      cell.parentNode?.replaceChild(newCell, cell);
    });
    emitChange();
  }

  function toggleHeaderCell() {
    const ctx = getTableContext();
    if (!ctx?.td) return;
    const cell = ctx.td;
    const newTag = cell.tagName === "TH" ? "td" : "th";
    const newCell = document.createElement(newTag);
    newCell.setAttribute("style", cell.getAttribute("style") || CELL_STYLE);
    newCell.innerHTML = cell.innerHTML;
    cell.parentNode?.replaceChild(newCell, cell);
    emitChange();
  }

  function distributeColumns() {
    const ctx = getTableContext();
    if (!ctx?.table) return;
    rebalanceColumns(ctx.table);
    emitChange();
  }

  // ---- Link popup ----

  function openLinkPopupInternal() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      linkSavedRange.current = sel.getRangeAt(0).cloneRange();
      setLinkText(sel.toString());
    } else {
      linkSavedRange.current = null;
      setLinkText("");
    }
    setLinkUrl("");
    setColorPopup(null);
    setShowTablePopup(false);
    setShowLink(true);
  }

  // ---- Keyboard shortcuts + auto-list detection ----

  function isAtBlockStart(textNode: Node, offsetInNode: number): boolean {
    const prev = (textNode.textContent || "").slice(0, offsetInNode);
    if (prev.trim() !== prev) return false;
    const BLOCK_TAGS = new Set([
      "P",
      "DIV",
      "BLOCKQUOTE",
      "LI",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
    ]);
    let ancestor: Node | null = textNode;
    while (ancestor && ancestor !== editorRef.current) {
      let sib = ancestor.previousSibling;
      while (sib) {
        if ((sib.textContent || "").trim()) return false;
        sib = sib.previousSibling;
      }
      if (
        ancestor.nodeType === Node.ELEMENT_NODE &&
        BLOCK_TAGS.has((ancestor as Element).tagName)
      )
        break;
      ancestor = ancestor.parentNode;
    }
    return true;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const ctrl = e.ctrlKey || e.metaKey;

    if (e.key === "Escape") {
      deselectImage();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        let inList = false;
        while (node && node !== editorRef.current) {
          if (node.nodeName === "LI") {
            inList = true;
            break;
          }
          node = node.parentNode;
        }
        if (inList) {
          document.execCommand(e.shiftKey ? "outdent" : "indent", false);
        } else if (!e.shiftKey) {
          document.execCommand("insertText", false, "\t");
        }
        emitChange();
      }
      return;
    }

    if (ctrl && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          exec("bold");
          return;
        case "i":
          e.preventDefault();
          exec("italic");
          return;
        case "u":
          e.preventDefault();
          exec("underline");
          return;
        case "k":
          e.preventDefault();
          openLinkPopupInternal();
          return;
      }
    }
    if (ctrl && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault();
      exec("strikeThrough");
      return;
    }

    if (e.key === " ") {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      const container = range.startContainer;
      if (container.nodeType !== Node.TEXT_NODE) return;
      const textBefore = (container.textContent || "").slice(
        0,
        range.startOffset,
      );
      const trimmed = textBefore.trimStart();
      const isBullet =
        (trimmed === "-" || trimmed === "*") &&
        isAtBlockStart(container, range.startOffset);
      const isOrdered =
        (trimmed === "1." || trimmed === "1)") &&
        isAtBlockStart(container, range.startOffset);
      if (isBullet || isOrdered) {
        e.preventDefault();
        const delRange = document.createRange();
        delRange.setStart(container, range.startOffset - trimmed.length);
        delRange.setEnd(container, range.startOffset);
        sel.removeAllRanges();
        sel.addRange(delRange);
        document.execCommand("delete", false);
        document.execCommand(
          isBullet ? "insertUnorderedList" : "insertOrderedList",
          false,
        );
        emitChange();
      }
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      selectImage(target as HTMLImageElement);
    } else {
      deselectImage();
    }
    refreshFormats();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) compressAndInsertImage(blob);
        return;
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    const items = e.dataTransfer?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) compressAndInsertImage(blob);
        return;
      }
    }
  }

  function commitLink() {
    const url = linkUrl.trim();
    if (!url) {
      setShowLink(false);
      return;
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const display = (linkText.trim() || href)
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const html = `<a href="${href}" target="_blank" rel="noopener noreferrer">${display}</a>`;
    editorRef.current?.focus();
    if (linkSavedRange.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(linkSavedRange.current);
      }
    }
    document.execCommand("insertHTML", false, html);
    emitChange();
    setShowLink(false);
    setLinkUrl("");
    setLinkText("");
    linkSavedRange.current = null;
  }

  // ---- Color helpers ----

  function restoreRange(savedRange: React.MutableRefObject<Range | null>) {
    const r = savedRange.current;
    if (!r) return;
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(r);
    }
    savedRange.current = null;
  }

  // ---- Color palette apply ----

  function applyColor(color: string, type: "font" | "highlight" | "bg") {
    setColorPopup(null);
    if (type === "font") {
      restoreRange(colorSavedRange);
      if (color !== "remove") {
        document.execCommand("foreColor", false, color);
        emitChange();
      }
    } else if (type === "highlight") {
      restoreRange(hlSavedRange);
      document.execCommand(
        "hiliteColor",
        false,
        color === "remove" ? "transparent" : color,
      );
      emitChange();
    } else {
      const cell = bgSavedCell.current;
      bgSavedCell.current = null;
      if (cell) {
        cell.style.backgroundColor = color === "remove" ? "" : color;
        emitChange();
      } else {
        setEditorBg(color === "remove" ? "" : color);
      }
    }
  }

  const mh = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  function tb(active: boolean): React.CSSProperties {
    return {
      background: active ? "#334155" : "none",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      padding: "3px 6px",
      lineHeight: 1,
      color: active ? "#f1f5f9" : "#94a3b8",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "13px",
    };
  }

  const tbDanger: React.CSSProperties = { ...tb(false), color: "#f87171" };

  const IMG_HANDLES: ImgHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div
      style={{
        border: "1px solid #334155",
        borderRadius: "6px",
        backgroundColor: "#0f172a",
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {/* Color palette popup */}
      {colorPopup && (
        <div
          ref={colorPopupRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: colorPopup.x,
            top: colorPopup.y,
            transform: colorPopup.y < window.innerHeight / 2 ? "none" : "translateY(-100%)",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "6px",
            padding: "8px",
            zIndex: 99999,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 18px)",
              gap: "3px",
              marginBottom: "4px",
            }}
          >
            {PALETTE.map((color) => (
              <button
                key={color}
                title={color}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyColor(color, colorPopup.type);
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "3px",
                  background: color,
                  border:
                    color === "#ffffff" || color === "#f1f5f9"
                      ? "1px solid #475569"
                      : "1px solid rgba(0,0,0,0.25)",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: "3px" }}>
            {colorPopup.type !== "font" && (
              <button
                title="Remove color"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyColor("remove", colorPopup.type);
                }}
                style={{
                  flex: 1,
                  height: 20,
                  borderRadius: "3px",
                  background: "none",
                  border: "1px solid #334155",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#f87171", fontSize: "11px" }}>✕</span> none
              </button>
            )}
            <button
              title="Custom color"
              onMouseDown={(e) => {
                e.preventDefault();
                setColorPopup(null);
                if (colorPopup.type === "font") colorInputRef.current?.click();
                else if (colorPopup.type === "highlight") hlInputRef.current?.click();
                else bgInputRef.current?.click();
              }}
              style={{
                flex: 1,
                height: 20,
                borderRadius: "3px",
                background: "none",
                border: "1px solid #334155",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              + custom
            </button>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 4,
            transform: "translate(-50%, -100%)",
            background: "#0f172a",
            color: "#e2e8f0",
            fontSize: "11px",
            lineHeight: 1.4,
            padding: "3px 8px",
            borderRadius: "4px",
            border: "1px solid #334155",
            pointerEvents: "none",
            zIndex: 99999,
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Main toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1px",
          padding: "4px 6px",
          borderBottom: "1px solid #1e293b",
          backgroundColor: "#0a1628",
          flexWrap: "wrap",
        }}
      >
        <TbBtn tip="Bold (Ctrl+B)" style={tb(formats.bold)} setTooltip={setTooltip} onAction={() => exec("bold")}>
          <strong>B</strong>
        </TbBtn>
        <TbBtn tip="Italic (Ctrl+I)" style={tb(formats.italic)} setTooltip={setTooltip} onAction={() => exec("italic")}>
          <em>I</em>
        </TbBtn>
        <TbBtn tip="Underline (Ctrl+U)" style={tb(formats.underline)} setTooltip={setTooltip} onAction={() => exec("underline")}>
          <span style={{ textDecoration: "underline" }}>U</span>
        </TbBtn>
        <TbBtn tip="Strikethrough (Ctrl+Shift+X)" style={tb(formats.strikeThrough)} setTooltip={setTooltip} onAction={() => exec("strikeThrough")}>
          <span style={{ textDecoration: "line-through" }}>S</span>
        </TbBtn>
        <TbBtn tip="Superscript" style={tb(formats.superscript)} setTooltip={setTooltip} onAction={() => exec("superscript")}>
          <span style={{ fontSize: "13px", lineHeight: 1 }}>x<sup style={{ fontSize: "8px" }}>2</sup></span>
        </TbBtn>
        <TbBtn tip="Subscript" style={tb(formats.subscript)} setTooltip={setTooltip} onAction={() => exec("subscript")}>
          <span style={{ fontSize: "13px", lineHeight: 1 }}>x<sub style={{ fontSize: "8px" }}>2</sub></span>
        </TbBtn>

        <Sep />

        <TbBtn tip="Increase font size" style={tb(false)} setTooltip={setTooltip} onAction={() => changeFontSize(1)}>
          <Icon name="font-increase" size={14} />
        </TbBtn>
        <TbBtn tip="Decrease font size" style={tb(false)} setTooltip={setTooltip} onAction={() => changeFontSize(-1)}>
          <Icon name="font-decrease" size={14} />
        </TbBtn>

        <Sep />

        <TbBtn tip="Bullet list" style={tb(formats.insertUnorderedList)} setTooltip={setTooltip} onAction={() => exec("insertUnorderedList")}>
          <Icon name="list-unordered" size={14} />
        </TbBtn>
        <TbBtn tip="Numbered list" style={tb(formats.insertOrderedList)} setTooltip={setTooltip} onAction={() => exec("insertOrderedList")}>
          <Icon name="list-ordered" size={14} />
        </TbBtn>

        <Sep />

        <TbBtn tip="Align left" style={tb(formats.justifyLeft)} setTooltip={setTooltip} onAction={() => exec("justifyLeft")}>
          <Icon name="align-left" size={14} />
        </TbBtn>
        <TbBtn tip="Align center" style={tb(formats.justifyCenter)} setTooltip={setTooltip} onAction={() => exec("justifyCenter")}>
          <Icon name="align-center" size={14} />
        </TbBtn>
        <TbBtn tip="Align right" style={tb(formats.justifyRight)} setTooltip={setTooltip} onAction={() => exec("justifyRight")}>
          <Icon name="align-right" size={14} />
        </TbBtn>
        <TbBtn tip="Justify" style={tb(formats.justifyFull)} setTooltip={setTooltip} onAction={() => exec("justifyFull")}>
          <Icon name="align-justify" size={14} />
        </TbBtn>

        <Sep />

        {/* Font color */}
        <TbBtn
          tip="Font color"
          style={tb(colorPopup?.type === "font")}
          setTooltip={setTooltip}
          onAction={(e) => {
            const sel = window.getSelection();
            colorSavedRange.current =
              sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
            const r = e.currentTarget.getBoundingClientRect();
            const y = window.innerHeight - r.bottom > 120 ? r.bottom + 4 : r.top - 4;
            setColorPopup({ type: "font", x: r.left, y });
            setShowLink(false);
            setShowTablePopup(false);
          }}
        >
          <Icon name="font-color" size={15} />
        </TbBtn>
        <input
          ref={colorInputRef}
          type="color"
          defaultValue="#f1f5f9"
          tabIndex={-1}
          onChange={(e) => {
            restoreRange(colorSavedRange);
            document.execCommand("foreColor", false, e.target.value);
            emitChange();
          }}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />

        {/* Highlight color */}
        <TbBtn
          tip="Highlight color"
          style={tb(colorPopup?.type === "highlight")}
          setTooltip={setTooltip}
          onAction={(e) => {
            const sel = window.getSelection();
            hlSavedRange.current =
              sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
            const r = e.currentTarget.getBoundingClientRect();
            const y = window.innerHeight - r.bottom > 120 ? r.bottom + 4 : r.top - 4;
            setColorPopup({ type: "highlight", x: r.left, y });
            setShowLink(false);
            setShowTablePopup(false);
          }}
        >
          <Icon name="highlight-color" size={15} />
        </TbBtn>
        <input
          ref={hlInputRef}
          type="color"
          defaultValue="#fef08a"
          tabIndex={-1}
          onChange={(e) => {
            restoreRange(hlSavedRange);
            document.execCommand("hiliteColor", false, e.target.value);
            emitChange();
          }}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />

        {/* Background color */}
        <TbBtn
          tip="Background color"
          style={tb(colorPopup?.type === "bg")}
          setTooltip={setTooltip}
          onAction={(e) => {
            const ctx = getTableContext();
            bgSavedCell.current = ctx?.td ?? null;
            const sel = window.getSelection();
            bgSavedRange.current =
              sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
            const r = e.currentTarget.getBoundingClientRect();
            const y = window.innerHeight - r.bottom > 120 ? r.bottom + 4 : r.top - 4;
            setColorPopup({ type: "bg", x: r.left, y });
            setShowLink(false);
            setShowTablePopup(false);
          }}
        >
          <Icon name="bg-color" size={15} />
        </TbBtn>
        <input
          ref={bgInputRef}
          type="color"
          defaultValue="#1e293b"
          tabIndex={-1}
          onChange={(e) => {
            const cell = bgSavedCell.current;
            bgSavedCell.current = null;
            if (cell) {
              cell.style.backgroundColor = e.target.value;
              emitChange();
            } else {
              setEditorBg(e.target.value);
            }
          }}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />

        {/* Link */}
        <TbBtn
          tip="Insert link (Ctrl+K)"
          style={tb(showLink)}
          setTooltip={setTooltip}
          onAction={openLinkPopupInternal}
        >
          <Icon name="link" size={14} />
        </TbBtn>

        <Sep />

        {/* Image */}
        <TbBtn
          tip="Insert image"
          style={tb(false)}
          setTooltip={setTooltip}
          onAction={() => imgInputRef.current?.click()}
        >
          <Icon name="image" size={14} />
        </TbBtn>
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              editorRef.current?.focus();
              compressAndInsertImage(file);
            }
            e.target.value = "";
          }}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />

        {/* Table */}
        <TbBtn
          tip="Insert table"
          style={tb(showTablePopup)}
          setTooltip={setTooltip}
          onAction={() => {
            setShowTablePopup((p) => !p);
            setShowLink(false);
            setColorPopup(null);
          }}
        >
          <Icon name="table" size={14} />
        </TbBtn>
      </div>

      {/* Table context toolbar */}
      {inTable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1px",
            padding: "3px 6px",
            borderBottom: "1px solid #1e293b",
            backgroundColor: "#07111f",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "#475569",
              marginRight: "4px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              userSelect: "none",
            }}
          >
            Table
          </span>
          <TbBtn tip="Insert row above" style={tb(false)} setTooltip={setTooltip} onAction={insertRowAbove}>
            <Icon name="table-row-above" size={14} />
          </TbBtn>
          <TbBtn tip="Insert row below" style={tb(false)} setTooltip={setTooltip} onAction={insertRowBelow}>
            <Icon name="table-row-below" size={14} />
          </TbBtn>
          <TbBtn tip="Delete row" style={tbDanger} setTooltip={setTooltip} onAction={deleteRow}>
            <Icon name="table-row-delete" size={14} />
          </TbBtn>
          <Sep />
          <TbBtn tip="Insert column left" style={tb(false)} setTooltip={setTooltip} onAction={insertColLeft}>
            <Icon name="table-col-left" size={14} />
          </TbBtn>
          <TbBtn tip="Insert column right" style={tb(false)} setTooltip={setTooltip} onAction={insertColRight}>
            <Icon name="table-col-right" size={14} />
          </TbBtn>
          <TbBtn tip="Delete column" style={tbDanger} setTooltip={setTooltip} onAction={deleteCol}>
            <Icon name="table-col-delete" size={14} />
          </TbBtn>
          <TbBtn tip="Distribute column widths" style={tb(false)} setTooltip={setTooltip} onAction={distributeColumns}>
            <Icon name="table-col-distribute" size={14} />
          </TbBtn>
          <Sep />
          <TbBtn tip="Toggle header row" style={tb(false)} setTooltip={setTooltip} onAction={toggleHeaderRow}>
            <Icon name="table-header-row" size={14} />
          </TbBtn>
          <TbBtn tip="Toggle header column" style={tb(false)} setTooltip={setTooltip} onAction={toggleHeaderCol}>
            <Icon name="table-header-col" size={14} />
          </TbBtn>
          <TbBtn tip="Toggle header cell" style={tb(false)} setTooltip={setTooltip} onAction={toggleHeaderCell}>
            <Icon name="table-header-cell" size={14} />
          </TbBtn>
          <TbBtn tip="Delete table" style={tbDanger} setTooltip={setTooltip} onAction={deleteTable}>
            <Icon name="table-delete" size={14} />
          </TbBtn>
        </div>
      )}

      {/* Editable area */}
      <div ref={editorWrapRef} style={{ position: "relative" }}>
        {isEmpty && placeholder && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              padding: "8px 10px",
              color: "#475569",
              fontSize: "13px",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          className="rte-editor"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyDown={handleKeyDown}
          onKeyUp={refreshFormats}
          onMouseUp={handleMouseUp}
          onMouseMove={handleEditorMouseMove}
          onMouseDown={handleEditorMouseDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          style={{
            minHeight: mh,
            maxHeight: `calc(${maxLines} * 1.6em + 14px)`,
            overflowY: "auto",
            padding: "8px 10px",
            outline: "none",
            fontSize: "13px",
            color: "#e2e8f0",
            lineHeight: "1.6",
            overflowWrap: "break-word",
            wordBreak: "break-word",
            cursor: colResizeCursor ? "col-resize" : undefined,
            backgroundColor: editorBg || undefined,
          }}
        />

        {/* Image resize overlay — 8 handles */}
        {selectedImg && imgOverlay && (
          <div
            ref={overlayRef}
            style={{
              position: "absolute",
              top: imgOverlay.top,
              left: imgOverlay.left,
              width: imgOverlay.width,
              height: imgOverlay.height,
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            {IMG_HANDLES.map((h) => (
              <div key={h} style={handleStyle(h)} onMouseDown={makeHandle(h)} />
            ))}
          </div>
        )}
      </div>

      {/* Link popup */}
      {showLink && (
        <div
          style={{
            borderTop: "1px solid #1e293b",
            backgroundColor: "#0a1628",
            padding: "8px 10px",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="URL"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLink();
              if (e.key === "Escape") setShowLink(false);
            }}
            style={linkInputStyle}
          />
          <input
            type="text"
            placeholder="Display text (optional)"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLink();
              if (e.key === "Escape") setShowLink(false);
            }}
            style={{ ...linkInputStyle, minWidth: 140 }}
          />
          <button onClick={commitLink} style={linkInsertBtnStyle}>
            Insert
          </button>
          <button onClick={() => setShowLink(false)} style={linkCancelBtnStyle}>
            Cancel
          </button>
        </div>
      )}

      {/* Table insert popup */}
      {showTablePopup && (
        <div
          style={{
            borderTop: "1px solid #1e293b",
            backgroundColor: "#0a1628",
            padding: "8px 10px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Rows:</span>
          <input
            type="number"
            min="1"
            max="20"
            value={tableRows}
            onChange={(e) => setTableRows(e.target.value)}
            style={{
              ...linkInputStyle,
              width: 38,
              minWidth: 0,
              flex: "none",
              textAlign: "center",
            }}
          />
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Cols:</span>
          <input
            type="number"
            min="1"
            max="20"
            value={tableCols}
            onChange={(e) => setTableCols(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") insertTable();
              if (e.key === "Escape") setShowTablePopup(false);
            }}
            style={{
              ...linkInputStyle,
              width: 38,
              minWidth: 0,
              flex: "none",
              textAlign: "center",
            }}
          />
          <button onClick={insertTable} style={linkInsertBtnStyle}>
            Insert
          </button>
          <button
            onClick={() => setShowTablePopup(false)}
            style={linkCancelBtnStyle}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Separator ----

function Sep() {
  return (
    <div
      style={{
        width: 1,
        height: 14,
        backgroundColor: "#334155",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );
}

// ---- Styles ----

const linkInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 100,
  padding: "4px 8px",
  borderRadius: "4px",
  border: "1px solid #334155",
  backgroundColor: "#1e293b",
  color: "#f1f5f9",
  fontSize: "12px",
  outline: "none",
};

const linkInsertBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "#3b82f6",
  color: "#fff",
  cursor: "pointer",
  fontSize: "12px",
  flexShrink: 0,
};

const linkCancelBtnStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "4px",
  border: "1px solid #334155",
  backgroundColor: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: "12px",
  flexShrink: 0,
};
