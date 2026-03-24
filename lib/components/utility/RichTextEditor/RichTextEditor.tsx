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
`;

function injectRteStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(RTE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = RTE_STYLE_ID;
  style.textContent = RTE_STYLES;
  document.head.appendChild(style);
}

// Inject as soon as the module loads on the client
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

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 80,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const colorSavedRange = useRef<Range | null>(null);
  const linkSavedRange = useRef<Range | null>(null);
  const lastEmitted = useRef(value || "");

  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertOrderedList: false,
    insertUnorderedList: false,
  });
  const [isEmpty, setIsEmpty] = useState(!(value || "").replace(/<[^>]*>/g, "").trim());
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

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

  function refreshFormats() {
    setFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
    });
  }

  function emitChange() {
    const el = editorRef.current;
    if (!el) return;
    const hasText = !!(el.textContent || "").trim();
    const emitted = hasText ? el.innerHTML : "";
    setIsEmpty(!hasText);
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
    // Text before the offset in the current node must be only the trigger chars
    const prev = (textNode.textContent || "").slice(0, offsetInNode);
    if (prev.trim() !== prev) return false; // leading whitespace → not at start

    const BLOCK_TAGS = new Set(["P", "DIV", "BLOCKQUOTE", "LI", "H1", "H2", "H3", "H4", "H5", "H6"]);

    // Walk up checking prior siblings, but stop at the nearest block ancestor.
    // This prevents previous paragraphs from falsely disqualifying a new-line start.
    let ancestor: Node | null = textNode;
    while (ancestor && ancestor !== editorRef.current) {
      let sib = ancestor.previousSibling;
      while (sib) {
        if ((sib.textContent || "").trim()) return false;
        sib = sib.previousSibling;
      }
      // Stop once we've cleared siblings inside a block element
      if (
        ancestor.nodeType === Node.ELEMENT_NODE &&
        BLOCK_TAGS.has((ancestor as Element).tagName)
      ) {
        break;
      }
      ancestor = ancestor.parentNode;
    }
    return true;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const ctrl = e.ctrlKey || e.metaKey;

    // ---- Tab / Shift+Tab ----
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

    // ---- Formatting shortcuts ----
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

    // ---- Auto-list detection on Space ----
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
      {/* Toolbar */}
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
        <button title="Bold" onMouseDown={(e) => tbMouseDown(e, () => exec("bold"))} style={tb(formats.bold)}>
          <strong>B</strong>
        </button>
        <button title="Italic" onMouseDown={(e) => tbMouseDown(e, () => exec("italic"))} style={tb(formats.italic)}>
          <em>I</em>
        </button>
        <button title="Underline" onMouseDown={(e) => tbMouseDown(e, () => exec("underline"))} style={tb(formats.underline)}>
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>
        <button title="Strikethrough" onMouseDown={(e) => tbMouseDown(e, () => exec("strikeThrough"))} style={tb(formats.strikeThrough)}>
          <span style={{ textDecoration: "line-through" }}>S</span>
        </button>

        <div style={{ width: 1, height: 14, backgroundColor: "#334155", margin: "0 4px", flexShrink: 0 }} />

        <button title="Bullet list" onMouseDown={(e) => tbMouseDown(e, () => exec("insertUnorderedList"))} style={tb(formats.insertUnorderedList)}>
          <BulletIcon />
        </button>
        <button title="Numbered list" onMouseDown={(e) => tbMouseDown(e, () => exec("insertOrderedList"))} style={tb(formats.insertOrderedList)}>
          <NumberIcon />
        </button>

        <div style={{ width: 1, height: 14, backgroundColor: "#334155", margin: "0 4px", flexShrink: 0 }} />

        {/* Font color */}
        <button
          title="Font color"
          onMouseDown={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            colorSavedRange.current = (sel && sel.rangeCount > 0)
              ? sel.getRangeAt(0).cloneRange()
              : null;
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
        <button
          title="Insert link"
          onMouseDown={openLinkPopup}
          style={tb(showLink)}
        >
          <LinkIcon />
        </button>
      </div>

      {/* Editable area */}
      <div style={{ position: "relative" }}>
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
          onMouseUp={refreshFormats}
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
    </div>
  );
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
