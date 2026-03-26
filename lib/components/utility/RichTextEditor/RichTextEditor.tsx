"use client";

import React, { useRef, useEffect, useState } from "react";

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

// ---- RichTextEditor ----

export interface RichTextEditorProps {
  /** HTML string value */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height of the editable area in pixels or a CSS string. Default: 80 */
  minHeight?: number | string;
  disabled?: boolean;
}

const CELL_STYLE = "border: 1px solid #475569; padding: 5px 10px; min-width: 60px;";

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 80,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const colorSavedRange = useRef<Range | null>(null);
  const linkSavedRange = useRef<Range | null>(null);
  const lastEmitted = useRef(value || "");
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startW: number; handle: "nw" | "ne" | "se" | "sw" } | null>(null);

  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertOrderedList: false,
    insertUnorderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });
  const [isEmpty, setIsEmpty] = useState(!(value || "").replace(/<[^>]*>/g, "").trim());
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [inTable, setInTable] = useState(false);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgOverlay, setImgOverlay] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

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
      if (editorWrapRef.current && !editorWrapRef.current.contains(e.target as Node)) {
        deselectImage();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Table context ----

  function getTableContext(): { td: HTMLTableCellElement | null; tr: HTMLTableRowElement | null; table: HTMLTableElement | null } | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    let td: HTMLTableCellElement | null = null;
    let tr: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName === "TD" || el.tagName === "TH") td = el as HTMLTableCellElement;
        if (el.tagName === "TR") tr = el as HTMLTableRowElement;
        if (el.tagName === "TABLE") { table = el as HTMLTableElement; break; }
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

  function tbMouseDown(e: React.MouseEvent, action: () => void) {
    e.preventDefault();
    action();
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
    editorRef.current?.querySelectorAll(".rte-img-selected").forEach(el => el.classList.remove("rte-img-selected"));
    img.classList.add("rte-img-selected");
    selectedImgRef.current = img;
    setSelectedImg(img);
    measureImg(img);
  }

  function deselectImage() {
    editorRef.current?.querySelectorAll(".rte-img-selected").forEach(el => el.classList.remove("rte-img-selected"));
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
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      editorRef.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${dataUrl}" style="max-width:100%;height:auto;" />`);
      emitChange();
    };
    img.src = url;
  }

  // ---- Image drag resize ----

  function startImgDrag(e: React.MouseEvent, handle: "nw" | "ne" | "se" | "sw") {
    const img = selectedImgRef.current;
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startW: img.getBoundingClientRect().width,
      handle,
    };

    function onMove(ev: MouseEvent) {
      const drag = dragRef.current;
      const target = selectedImgRef.current;
      if (!drag || !target) return;
      const dx = ev.clientX - drag.startX;
      const isRight = drag.handle === "se" || drag.handle === "ne";
      const newW = Math.max(40, drag.startW + (isRight ? dx : -dx));
      target.style.width = `${newW}px`;
      target.style.height = "auto";
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

  const handleCorner = (handle: "nw" | "ne" | "se" | "sw") => (e: React.MouseEvent) => startImgDrag(e, handle);

  // ---- Table operations ----

  function insertTable() {
    const rows = Math.max(1, parseInt(tableRows) || 3);
    const cols = Math.max(1, parseInt(tableCols) || 3);
    let html = `<table style="border-collapse:collapse;margin:6px 0;"><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="${CELL_STYLE}">&nbsp;</td>`;
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
    return Array.from(td.parentElement?.cells ?? []).indexOf(td);
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
      if (ref) row.insertBefore(cell, ref); else row.appendChild(cell);
    }
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
      if (ref) row.insertBefore(cell, ref); else row.appendChild(cell);
    }
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
    emitChange();
  }

  function toggleHeaderRow() {
    const ctx = getTableContext();
    if (!ctx?.tr) return;
    const isHeader = Array.from(ctx.tr.cells).every(c => c.tagName === "TH");
    const newTag = isHeader ? "td" : "th";
    Array.from(ctx.tr.cells).forEach(cell => {
      const newCell = document.createElement(newTag);
      newCell.setAttribute("style", CELL_STYLE);
      newCell.innerHTML = cell.innerHTML;
      ctx.tr!.replaceChild(newCell, cell);
    });
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
    setShowLink(true);
  }

  function openLinkPopup(e: React.MouseEvent) {
    e.preventDefault();
    openLinkPopupInternal();
  }

  // ---- Keyboard shortcuts + auto-list detection ----

  function isAtBlockStart(textNode: Node, offsetInNode: number): boolean {
    const prev = (textNode.textContent || "").slice(0, offsetInNode);
    if (prev.trim() !== prev) return false;
    const BLOCK_TAGS = new Set(["P", "DIV", "BLOCKQUOTE", "LI", "H1", "H2", "H3", "H4", "H5", "H6"]);
    let ancestor: Node | null = textNode;
    while (ancestor && ancestor !== editorRef.current) {
      let sib = ancestor.previousSibling;
      while (sib) {
        if ((sib.textContent || "").trim()) return false;
        sib = sib.previousSibling;
      }
      if (ancestor.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((ancestor as Element).tagName)) break;
      ancestor = ancestor.parentNode;
    }
    return true;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const ctrl = e.ctrlKey || e.metaKey;

    if (e.key === "Escape") { deselectImage(); return; }

    if (e.key === "Tab") {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        let inList = false;
        while (node && node !== editorRef.current) {
          if (node.nodeName === "LI") { inList = true; break; }
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
        case "b": e.preventDefault(); exec("bold"); return;
        case "i": e.preventDefault(); exec("italic"); return;
        case "u": e.preventDefault(); exec("underline"); return;
        case "k": e.preventDefault(); openLinkPopupInternal(); return;
      }
    }
    if (ctrl && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault(); exec("strikeThrough"); return;
    }

    if (e.key === " ") {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      const container = range.startContainer;
      if (container.nodeType !== Node.TEXT_NODE) return;
      const textBefore = (container.textContent || "").slice(0, range.startOffset);
      const trimmed = textBefore.trimStart();
      const isBullet = (trimmed === "-" || trimmed === "*") && isAtBlockStart(container, range.startOffset);
      const isOrdered = (trimmed === "1." || trimmed === "1)") && isAtBlockStart(container, range.startOffset);
      if (isBullet || isOrdered) {
        e.preventDefault();
        const delRange = document.createRange();
        delRange.setStart(container, range.startOffset - trimmed.length);
        delRange.setEnd(container, range.startOffset);
        sel.removeAllRanges();
        sel.addRange(delRange);
        document.execCommand("delete", false);
        document.execCommand(isBullet ? "insertUnorderedList" : "insertOrderedList", false);
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
    if (!url) { setShowLink(false); return; }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const display = (linkText.trim() || href).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<a href="${href}" target="_blank" rel="noopener noreferrer">${display}</a>`;
    editorRef.current?.focus();
    if (linkSavedRange.current) {
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(linkSavedRange.current); }
    }
    document.execCommand("insertHTML", false, html);
    emitChange();
    setShowLink(false);
    setLinkUrl("");
    setLinkText("");
    linkSavedRange.current = null;
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

  const cornerStyle = (cursor: string, top?: number | string, right?: number | string, bottom?: number | string, left?: number | string): React.CSSProperties => ({
    position: "absolute",
    width: 8,
    height: 8,
    background: "#3b82f6",
    border: "1px solid #fff",
    borderRadius: "2px",
    cursor,
    zIndex: 10,
    pointerEvents: "all",
    ...(top !== undefined ? { top } : {}),
    ...(right !== undefined ? { right } : {}),
    ...(bottom !== undefined ? { bottom } : {}),
    ...(left !== undefined ? { left } : {}),
  });

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
        <button title="Bold (Ctrl+B)" onMouseDown={(e) => tbMouseDown(e, () => exec("bold"))} style={tb(formats.bold)}>
          <strong>B</strong>
        </button>
        <button title="Italic (Ctrl+I)" onMouseDown={(e) => tbMouseDown(e, () => exec("italic"))} style={tb(formats.italic)}>
          <em>I</em>
        </button>
        <button title="Underline (Ctrl+U)" onMouseDown={(e) => tbMouseDown(e, () => exec("underline"))} style={tb(formats.underline)}>
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>
        <button title="Strikethrough (Ctrl+Shift+X)" onMouseDown={(e) => tbMouseDown(e, () => exec("strikeThrough"))} style={tb(formats.strikeThrough)}>
          <span style={{ textDecoration: "line-through" }}>S</span>
        </button>

        <Sep />

        <button title="Bullet list" onMouseDown={(e) => tbMouseDown(e, () => exec("insertUnorderedList"))} style={tb(formats.insertUnorderedList)}>
          <BulletIcon />
        </button>
        <button title="Numbered list" onMouseDown={(e) => tbMouseDown(e, () => exec("insertOrderedList"))} style={tb(formats.insertOrderedList)}>
          <NumberIcon />
        </button>

        <Sep />

        <button title="Align left" onMouseDown={(e) => tbMouseDown(e, () => exec("justifyLeft"))} style={tb(formats.justifyLeft)}>
          <AlignLeftIcon />
        </button>
        <button title="Align center" onMouseDown={(e) => tbMouseDown(e, () => exec("justifyCenter"))} style={tb(formats.justifyCenter)}>
          <AlignCenterIcon />
        </button>
        <button title="Align right" onMouseDown={(e) => tbMouseDown(e, () => exec("justifyRight"))} style={tb(formats.justifyRight)}>
          <AlignRightIcon />
        </button>
        <button title="Justify" onMouseDown={(e) => tbMouseDown(e, () => exec("justifyFull"))} style={tb(formats.justifyFull)}>
          <AlignJustifyIcon />
        </button>

        <Sep />

        {/* Font color */}
        <button
          title="Font color"
          onMouseDown={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            colorSavedRange.current = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;
            colorInputRef.current?.click();
          }}
          style={tb(false)}
        >
          <ColorIcon />
        </button>
        <input
          ref={colorInputRef}
          type="color"
          defaultValue="#f1f5f9"
          tabIndex={-1}
          onChange={(e) => {
            editorRef.current?.focus();
            if (colorSavedRange.current) {
              const sel = window.getSelection();
              if (sel) { sel.removeAllRanges(); sel.addRange(colorSavedRange.current); }
              colorSavedRange.current = null;
            }
            document.execCommand("foreColor", false, e.target.value);
            emitChange();
          }}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />

        {/* Link */}
        <button title="Insert link (Ctrl+K)" onMouseDown={openLinkPopup} style={tb(showLink)}>
          <LinkIcon />
        </button>

        <Sep />

        {/* Image */}
        <button
          title="Insert image"
          onMouseDown={(e) => { e.preventDefault(); imgInputRef.current?.click(); }}
          style={tb(false)}
        >
          <ImageIcon />
        </button>
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
        <button
          title="Insert table"
          onMouseDown={(e) => { e.preventDefault(); setShowTablePopup(p => !p); setShowLink(false); }}
          style={tb(showTablePopup)}
        >
          <TableIcon />
        </button>
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
          <span style={{ fontSize: "10px", color: "#475569", marginRight: "4px", letterSpacing: "0.06em", textTransform: "uppercase", userSelect: "none" }}>
            Table
          </span>
          <button title="Insert row above" onMouseDown={(e) => tbMouseDown(e, insertRowAbove)} style={tb(false)}><RowAboveIcon /></button>
          <button title="Insert row below" onMouseDown={(e) => tbMouseDown(e, insertRowBelow)} style={tb(false)}><RowBelowIcon /></button>
          <button title="Delete row" onMouseDown={(e) => tbMouseDown(e, deleteRow)} style={tb(false)}><DeleteRowIcon /></button>
          <Sep />
          <button title="Insert column left" onMouseDown={(e) => tbMouseDown(e, insertColLeft)} style={tb(false)}><ColLeftIcon /></button>
          <button title="Insert column right" onMouseDown={(e) => tbMouseDown(e, insertColRight)} style={tb(false)}><ColRightIcon /></button>
          <button title="Delete column" onMouseDown={(e) => tbMouseDown(e, deleteCol)} style={tb(false)}><DeleteColIcon /></button>
          <Sep />
          <button title="Toggle header row" onMouseDown={(e) => tbMouseDown(e, toggleHeaderRow)} style={tb(false)}><HeaderRowIcon /></button>
          <button title="Delete table" onMouseDown={(e) => tbMouseDown(e, deleteTable)} style={{ ...tb(false), color: "#f87171" }}><DeleteTableIcon /></button>
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
          onPaste={handlePaste}
          onDrop={handleDrop}
          style={{
            minHeight: mh,
            padding: "8px 10px",
            outline: "none",
            fontSize: "13px",
            color: "#e2e8f0",
            lineHeight: "1.6",
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        />

        {/* Image resize overlay */}
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
            <div style={cornerStyle("nw-resize", -4, undefined, undefined, -4)} onMouseDown={handleCorner("nw")} />
            <div style={cornerStyle("ne-resize", -4, -4, undefined, undefined)} onMouseDown={handleCorner("ne")} />
            <div style={cornerStyle("sw-resize", undefined, undefined, -4, -4)} onMouseDown={handleCorner("sw")} />
            <div style={cornerStyle("se-resize", undefined, -4, -4, undefined)} onMouseDown={handleCorner("se")} />
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
          <button onClick={commitLink} style={linkInsertBtnStyle}>Insert</button>
          <button onClick={() => setShowLink(false)} style={linkCancelBtnStyle}>Cancel</button>
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
            style={{ ...linkInputStyle, width: 52, flex: "none", textAlign: "center" }}
          />
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Cols:</span>
          <input
            type="number"
            min="1"
            max="20"
            value={tableCols}
            onChange={(e) => setTableCols(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") insertTable(); if (e.key === "Escape") setShowTablePopup(false); }}
            style={{ ...linkInputStyle, width: 52, flex: "none", textAlign: "center" }}
          />
          <button onClick={insertTable} style={linkInsertBtnStyle}>Insert</button>
          <button onClick={() => setShowTablePopup(false)} style={linkCancelBtnStyle}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ---- Separator ----

function Sep() {
  return <div style={{ width: 1, height: 14, backgroundColor: "#334155", margin: "0 4px", flexShrink: 0 }} />;
}

// ---- Icons ----

function BulletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="2" cy="3.5" r="1.3" />
      <rect x="5" y="2.9" width="8" height="1.2" rx="0.6" />
      <circle cx="2" cy="7" r="1.3" />
      <rect x="5" y="6.4" width="8" height="1.2" rx="0.6" />
      <circle cx="2" cy="10.5" r="1.3" />
      <rect x="5" y="9.9" width="8" height="1.2" rx="0.6" />
    </svg>
  );
}

function NumberIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <text x="0.5" y="5" fontSize="4.5" fontFamily="monospace">1.</text>
      <rect x="5.5" y="2.9" width="7.5" height="1.2" rx="0.6" />
      <text x="0.5" y="8.5" fontSize="4.5" fontFamily="monospace">2.</text>
      <rect x="5.5" y="6.4" width="7.5" height="1.2" rx="0.6" />
      <text x="0.5" y="12" fontSize="4.5" fontFamily="monospace">3.</text>
      <rect x="5.5" y="9.9" width="7.5" height="1.2" rx="0.6" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
      <rect x="1" y="4.8" width="8" height="1.3" rx="0.6" />
      <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
      <rect x="1" y="10.4" width="7" height="1.3" rx="0.6" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
      <rect x="3" y="4.8" width="8" height="1.3" rx="0.6" />
      <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
      <rect x="3.5" y="10.4" width="7" height="1.3" rx="0.6" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
      <rect x="5" y="4.8" width="8" height="1.3" rx="0.6" />
      <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
      <rect x="6" y="10.4" width="7" height="1.3" rx="0.6" />
    </svg>
  );
}

function AlignJustifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
      <rect x="1" y="4.8" width="12" height="1.3" rx="0.6" />
      <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
      <rect x="1" y="10.4" width="12" height="1.3" rx="0.6" />
    </svg>
  );
}

function ColorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <text x="1.5" y="12" fontSize="12" fontFamily="Georgia, serif" fontWeight="bold" fill="currentColor">A</text>
      <rect x="1.5" y="13" width="12" height="1.5" rx="0.5" fill="#ef4444" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M5.3 8.7C6 9.4 7.2 9.5 8 8.8l2.2-2.2c.8-.8.8-2.1 0-2.9-.8-.8-2.1-.8-2.9 0L6.5 4.5" />
      <path d="M8.7 5.3C8 4.6 6.8 4.5 6 5.2L3.8 7.4c-.8.8-.8 2.1 0 2.9.8.8 2.1.8 2.9 0L7.5 9.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1.5" width="13" height="11" rx="1.5" />
      <circle cx="4.5" cy="4.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M1 10l3.5-3.5 2.5 2.5 2-2L14 11" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1.5" width="13" height="11" rx="1.5" />
      <line x1="1" y1="5.5" x2="14" y2="5.5" />
      <line x1="1" y1="9" x2="14" y2="9" />
      <line x1="5.5" y1="5.5" x2="5.5" y2="12.5" />
      <line x1="9.5" y1="5.5" x2="9.5" y2="12.5" />
    </svg>
  );
}

function RowAboveIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="6" width="13" height="7" rx="1" />
      <line x1="1" y1="9.5" x2="14" y2="9.5" />
      <line x1="5.5" y1="6" x2="5.5" y2="13" />
      <line x1="9.5" y1="6" x2="9.5" y2="13" />
      <line x1="7.5" y1="1" x2="7.5" y2="4.5" />
      <polyline points="5.5,2.5 7.5,1 9.5,2.5" />
    </svg>
  );
}

function RowBelowIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="13" height="7" rx="1" />
      <line x1="1" y1="4.5" x2="14" y2="4.5" />
      <line x1="5.5" y1="1" x2="5.5" y2="8" />
      <line x1="9.5" y1="1" x2="9.5" y2="8" />
      <line x1="7.5" y1="9.5" x2="7.5" y2="13" />
      <polyline points="5.5,11.5 7.5,13 9.5,11.5" />
    </svg>
  );
}

function DeleteRowIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="3" width="13" height="8" rx="1" />
      <line x1="1" y1="7" x2="14" y2="7" />
      <line x1="5.5" y1="3" x2="5.5" y2="11" />
      <line x1="9.5" y1="3" x2="9.5" y2="11" />
      <line x1="5" y1="5" x2="8.5" y2="5" stroke="#f87171" />
      <line x1="5" y1="9" x2="8.5" y2="9" stroke="#f87171" />
    </svg>
  );
}

function ColLeftIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="4" y="1" width="10" height="12" rx="1" />
      <line x1="4" y1="5" x2="14" y2="5" />
      <line x1="4" y1="9" x2="14" y2="9" />
      <line x1="9" y1="1" x2="9" y2="13" />
      <line x1="3" y1="7" x2="0.5" y2="7" />
      <polyline points="2,5.5 0.5,7 2,8.5" />
    </svg>
  );
}

function ColRightIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="10" height="12" rx="1" />
      <line x1="1" y1="5" x2="11" y2="5" />
      <line x1="1" y1="9" x2="11" y2="9" />
      <line x1="6" y1="1" x2="6" y2="13" />
      <line x1="12" y1="7" x2="14.5" y2="7" />
      <polyline points="13,5.5 14.5,7 13,8.5" />
    </svg>
  );
}

function DeleteColIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="13" height="12" rx="1" />
      <line x1="1" y1="5" x2="14" y2="5" />
      <line x1="1" y1="9" x2="14" y2="9" />
      <line x1="7.5" y1="1" x2="7.5" y2="13" />
      <line x1="3.5" y1="3" x2="6" y2="3" stroke="#f87171" />
      <line x1="9" y1="3" x2="11.5" y2="3" stroke="#f87171" />
    </svg>
  );
}

function HeaderRowIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="13" height="12" rx="1" />
      <rect x="1" y="1" width="13" height="4.5" rx="1" fill="currentColor" fillOpacity="0.25" />
      <line x1="1" y1="5.5" x2="14" y2="5.5" />
      <line x1="1" y1="9" x2="14" y2="9" />
      <line x1="5.5" y1="5.5" x2="5.5" y2="13" />
      <line x1="9.5" y1="5.5" x2="9.5" y2="13" />
    </svg>
  );
}

function DeleteTableIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="13" height="12" rx="1" />
      <line x1="1" y1="5" x2="14" y2="5" />
      <line x1="1" y1="9" x2="14" y2="9" />
      <line x1="5.5" y1="1" x2="5.5" y2="13" />
      <line x1="9.5" y1="1" x2="9.5" y2="13" />
      <line x1="4" y1="3" x2="7" y2="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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
