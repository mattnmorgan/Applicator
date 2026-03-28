import React from "react";

export type IconName =
  | "home"
  | "bell"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "copy"
  | "crown"
  | "download"
  | "drag"
  | "edit"
  | "external-link"
  | "eye"
  | "eye-off"
  | "file"
  | "folder"
  | "hamburger"
  | "sandwich"
  | "info"
  | "link"
  | "logout"
  | "move"
  | "play"
  | "plus"
  | "refresh"
  | "search"
  | "settings"
  | "square-stop"
  | "trash"
  | "upload"
  | "user"
  | "users"
  | "warning"
  | "word-wrap"
  | "list-view"
  | "grid-view"
  | "grid-view-small"
  | "reply"
  | "clipboard"
  | "code"
  | "image"
  | "spreadsheet"
  | "archive"
  | "audio"
  | "video"
  | "globe"
  | "library"
  | "sticky-note"
  | "star"
  | "pin"
  // Text formatting
  | "list-unordered"
  | "list-ordered"
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-justify"
  | "font-color"
  | "superscript"
  | "subscript"
  | "font-increase"
  | "font-decrease"
  | "highlight-color"
  | "bg-color"
  // Table
  | "table"
  | "table-row-above"
  | "table-row-below"
  | "table-row-delete"
  | "table-col-left"
  | "table-col-right"
  | "table-col-delete"
  | "table-header-row"
  | "table-header-col"
  | "table-header-cell"
  | "table-delete";

interface IconProps {
  name: IconName | string;
  size?: number;
}

export default function Icon({ name, size = 16 }: IconProps) {
  const base = {
    width: size,
    height: size,
    viewBox: "0 0 24 24" as string,
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.5 as number,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...base}>
          <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );

    case "bell":
      return (
        <svg {...base}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );

    case "check":
      return (
        <svg {...base}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case "chevron-down":
      return (
        <svg {...base}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );

    case "chevron-up":
      return (
        <svg {...base}>
          <polyline points="18 15 12 9 6 15" />
        </svg>
      );

    case "chevron-left":
      return (
        <svg {...base}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );

    case "chevron-right":
      return (
        <svg {...base}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );

    case "close":
      return (
        <svg {...base}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );

    case "copy":
      return (
        <svg {...base}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );

    case "crown":
      return (
        <svg {...base}>
          <path d="M2 20h20" />
          <path d="M2 20L5 10L9 15L12 5L15 15L19 10L22 20" />
        </svg>
      );

    case "download":
      return (
        <svg {...base}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );

    case "drag":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <circle cx="8" cy="6" r="1.5" />
          <circle cx="16" cy="6" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
        </svg>
      );

    case "edit":
      return (
        <svg {...base}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );

    case "external-link":
      return (
        <svg {...base}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );

    case "eye":
      return (
        <svg {...base}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    case "eye-off":
      return (
        <svg {...base}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      );

    case "file":
      return (
        <svg {...base}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );

    case "folder":
      return (
        <svg {...base}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );

    case "hamburger":
    case "sandwich":
      return (
        <svg {...base}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );

    case "info":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );

    case "link":
      return (
        <svg {...base}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );

    case "logout":
      return (
        <svg {...base}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );

    case "move":
      return (
        <svg {...base}>
          <polyline points="5 9 2 12 5 15" />
          <polyline points="9 5 12 2 15 5" />
          <polyline points="15 19 12 22 9 19" />
          <polyline points="19 9 22 12 19 15" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      );

    case "play":
      return (
        <svg {...base} fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      );

    case "plus":
      return (
        <svg {...base}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...base}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );

    case "search":
      return (
        <svg {...base}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );

    case "settings":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );

    case "square-stop":
      return (
        <svg {...base} fill="currentColor" stroke="none">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );

    case "trash":
      return (
        <svg {...base}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );

    case "upload":
      return (
        <svg {...base}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );

    case "user":
      return (
        <svg {...base}>
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      );

    case "users":
      return (
        <svg {...base}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "warning":
      return (
        <svg {...base}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );

    case "word-wrap":
      return (
        <svg {...base}>
          <path d="M4 6h16M4 12h12a3.5 3.5 0 0 1 0 7h-2" />
          <path d="M16 17l-2 2.5 2 2.5" />
        </svg>
      );

    case "list-view":
      return (
        <svg {...base}>
          <line x1="9" y1="6" x2="21" y2="6" />
          <line x1="9" y1="12" x2="21" y2="12" />
          <line x1="9" y1="18" x2="21" y2="18" />
          <rect x="3" y="4.5" width="3" height="3" rx="0.5" />
          <rect x="3" y="10.5" width="3" height="3" rx="0.5" />
          <rect x="3" y="16.5" width="3" height="3" rx="0.5" />
        </svg>
      );

    case "grid-view":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "grid-view-small":
      return (
        <svg {...base}>
          <rect x="2" y="2" width="6" height="6" rx="1" />
          <rect x="9" y="2" width="6" height="6" rx="1" />
          <rect x="16" y="2" width="6" height="6" rx="1" />
          <rect x="2" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <rect x="16" y="9" width="6" height="6" rx="1" />
          <rect x="2" y="16" width="6" height="6" rx="1" />
          <rect x="9" y="16" width="6" height="6" rx="1" />
          <rect x="16" y="16" width="6" height="6" rx="1" />
        </svg>
      );

    case "reply":
      return (
        <svg {...base}>
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      );

    case "clipboard":
      return (
        <svg {...base}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );

    case "code":
      return (
        <svg {...base}>
          <polyline points="8 5 2 12 8 19" />
          <polyline points="16 5 22 12 16 19" />
        </svg>
      );

    case "image":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );

    case "spreadsheet":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
      );

    case "archive":
      return (
        <svg {...base}>
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      );

    case "audio":
      return (
        <svg {...base}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );

    case "video":
      return (
        <svg {...base}>
          <rect x="2" y="7" width="15" height="10" rx="1" />
          <path d="M17 9.5l5-3v11l-5-3v-5z" />
        </svg>
      );

    case "globe":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );

    case "library":
      return (
        <svg {...base}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3-3h7z" />
        </svg>
      );

    case "sticky-note":
      return (
        <svg {...base}>
          <path d="M5 3h10l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <polyline points="15 3 15 7 19 7" />
        </svg>
      );

    case "star":
      return (
        <svg {...base}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );

    case "pin":
      return (
        <svg {...base}>
          <path d="M12 22v-7" />
          <path d="M9 8V3h6v5l2.5 4H6.5L9 8z" />
        </svg>
      );

    // ---- Text formatting ----

    case "list-unordered":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <circle cx="2" cy="3.5" r="1.3" />
          <rect x="5" y="2.9" width="8" height="1.2" rx="0.6" />
          <circle cx="2" cy="7" r="1.3" />
          <rect x="5" y="6.4" width="8" height="1.2" rx="0.6" />
          <circle cx="2" cy="10.5" r="1.3" />
          <rect x="5" y="9.9" width="8" height="1.2" rx="0.6" />
        </svg>
      );

    case "list-ordered":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <text x="0.5" y="5" fontSize="4.5" fontFamily="monospace">1.</text>
          <rect x="5.5" y="2.9" width="7.5" height="1.2" rx="0.6" />
          <text x="0.5" y="8.5" fontSize="4.5" fontFamily="monospace">2.</text>
          <rect x="5.5" y="6.4" width="7.5" height="1.2" rx="0.6" />
          <text x="0.5" y="12" fontSize="4.5" fontFamily="monospace">3.</text>
          <rect x="5.5" y="9.9" width="7.5" height="1.2" rx="0.6" />
        </svg>
      );

    case "align-left":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
          <rect x="1" y="4.8" width="8" height="1.3" rx="0.6" />
          <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
          <rect x="1" y="10.4" width="7" height="1.3" rx="0.6" />
        </svg>
      );

    case "align-center":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
          <rect x="3" y="4.8" width="8" height="1.3" rx="0.6" />
          <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
          <rect x="3.5" y="10.4" width="7" height="1.3" rx="0.6" />
        </svg>
      );

    case "align-right":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
          <rect x="5" y="4.8" width="8" height="1.3" rx="0.6" />
          <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
          <rect x="6" y="10.4" width="7" height="1.3" rx="0.6" />
        </svg>
      );

    case "align-justify":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <rect x="1" y="2" width="12" height="1.3" rx="0.6" />
          <rect x="1" y="4.8" width="12" height="1.3" rx="0.6" />
          <rect x="1" y="7.6" width="12" height="1.3" rx="0.6" />
          <rect x="1" y="10.4" width="12" height="1.3" rx="0.6" />
        </svg>
      );

    case "font-color":
      return (
        <svg {...base} viewBox="0 0 15 15" fill="currentColor" stroke="none">
          <text x="1.5" y="12" fontSize="12" fontFamily="Georgia, serif" fontWeight="bold">A</text>
          <rect x="1.5" y="13" width="12" height="1.5" rx="0.5" />
        </svg>
      );

    case "superscript":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <text x="0.5" y="13" fontSize="9" fontFamily="Georgia, serif" fontWeight="bold">A</text>
          <text x="8" y="7" fontSize="6" fontFamily="Georgia, serif" fontWeight="bold">2</text>
        </svg>
      );

    case "subscript":
      return (
        <svg {...base} viewBox="0 0 14 14" fill="currentColor" stroke="none">
          <text x="0.5" y="11" fontSize="9" fontFamily="Georgia, serif" fontWeight="bold">A</text>
          <text x="8" y="14" fontSize="6" fontFamily="Georgia, serif" fontWeight="bold">2</text>
        </svg>
      );

    case "font-increase":
      return (
        <svg {...base} viewBox="0 0 15 14" fill="currentColor" stroke="none">
          <text x="1" y="13" fontSize="10" fontFamily="Georgia, serif" fontWeight="bold">A</text>
          <rect x="9.5" y="4.5" width="4.5" height="1.2" rx="0.6" />
          <rect x="11.1" y="2.25" width="1.2" height="4.5" rx="0.6" />
        </svg>
      );

    case "font-decrease":
      return (
        <svg {...base} viewBox="0 0 15 14" fill="currentColor" stroke="none">
          <text x="1" y="13" fontSize="10" fontFamily="Georgia, serif" fontWeight="bold">A</text>
          <rect x="9.5" y="4.5" width="4.5" height="1.2" rx="0.6" />
        </svg>
      );

    case "highlight-color":
      return (
        <svg {...base} viewBox="0 0 15 15" fill="currentColor" stroke="none">
          <rect x="0.5" y="3" width="14" height="8" rx="1.5" fillOpacity={0.3} />
          <text x="2" y="12" fontSize="10" fontFamily="Georgia, serif" fontWeight="bold">A</text>
          <rect x="0.5" y="13.2" width="14" height="1.3" rx="0.5" />
        </svg>
      );

    case "bg-color":
      return (
        <svg {...base} viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth={1.3}>
          <rect x="1" y="1.5" width="13" height="9.5" rx="1.5" fill="currentColor" fillOpacity={0.25} />
          <rect x="1" y="1.5" width="13" height="9.5" rx="1.5" />
          <rect x="0.5" y="13.2" width="14" height="1.3" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      );

    case "table-header-cell":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="13" height="12" rx="1" />
          <line x1="1" y1="5.5" x2="14" y2="5.5" />
          <line x1="1" y1="9" x2="14" y2="9" />
          <line x1="5.5" y1="1" x2="5.5" y2="13" />
          <line x1="9.5" y1="1" x2="9.5" y2="13" />
          <rect x="5.5" y="1" width="4" height="4.5" fill="currentColor" fillOpacity={0.4} stroke="none" />
        </svg>
      );

    // ---- Table ----

    case "table":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1.5" width="13" height="11" rx="1.5" />
          <line x1="1" y1="5.5" x2="14" y2="5.5" />
          <line x1="1" y1="9" x2="14" y2="9" />
          <line x1="5.5" y1="5.5" x2="5.5" y2="12.5" />
          <line x1="9.5" y1="5.5" x2="9.5" y2="12.5" />
        </svg>
      );

    case "table-row-above":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="6" width="13" height="7" rx="1" />
          <line x1="1" y1="9.5" x2="14" y2="9.5" />
          <line x1="5.5" y1="6" x2="5.5" y2="13" />
          <line x1="9.5" y1="6" x2="9.5" y2="13" />
          <line x1="7.5" y1="1" x2="7.5" y2="4.5" />
          <polyline points="5.5,2.5 7.5,1 9.5,2.5" />
        </svg>
      );

    case "table-row-below":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="13" height="7" rx="1" />
          <line x1="1" y1="4.5" x2="14" y2="4.5" />
          <line x1="5.5" y1="1" x2="5.5" y2="8" />
          <line x1="9.5" y1="1" x2="9.5" y2="8" />
          <line x1="7.5" y1="9.5" x2="7.5" y2="13" />
          <polyline points="5.5,11.5 7.5,13 9.5,11.5" />
        </svg>
      );

    case "table-row-delete":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="13" height="12" rx="1" />
          <line x1="1" y1="5" x2="14" y2="5" />
          <line x1="1" y1="9" x2="14" y2="9" />
          <line x1="7.5" y1="1" x2="7.5" y2="13" />
          <rect x="1.5" y="5.2" width="12" height="3.6" fill="currentColor" fillOpacity={0.25} stroke="none" />
          <line x1="5" y1="7" x2="10" y2="7" strokeWidth={1.5} />
        </svg>
      );

    case "table-col-left":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="4" y="1" width="10" height="12" rx="1" />
          <line x1="4" y1="5" x2="14" y2="5" />
          <line x1="4" y1="9" x2="14" y2="9" />
          <line x1="9" y1="1" x2="9" y2="13" />
          <line x1="3" y1="7" x2="0.5" y2="7" />
          <polyline points="2,5.5 0.5,7 2,8.5" />
        </svg>
      );

    case "table-col-right":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="10" height="12" rx="1" />
          <line x1="1" y1="5" x2="11" y2="5" />
          <line x1="1" y1="9" x2="11" y2="9" />
          <line x1="6" y1="1" x2="6" y2="13" />
          <line x1="12" y1="7" x2="14.5" y2="7" />
          <polyline points="13,5.5 14.5,7 13,8.5" />
        </svg>
      );

    case "table-col-delete":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="13" height="12" rx="1" />
          <line x1="1" y1="7" x2="14" y2="7" />
          <line x1="5.5" y1="1" x2="5.5" y2="13" />
          <line x1="9.5" y1="1" x2="9.5" y2="13" />
          <rect x="5.7" y="1.5" width="3.6" height="11" fill="currentColor" fillOpacity={0.25} stroke="none" />
          <line x1="7.5" y1="4.5" x2="7.5" y2="9.5" strokeWidth={1.5} />
        </svg>
      );

    case "table-header-row":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="13" height="12" rx="1" />
          <rect x="1" y="1" width="13" height="4.5" rx="1" fill="currentColor" fillOpacity={0.25} stroke="none" />
          <line x1="1" y1="5.5" x2="14" y2="5.5" />
          <line x1="1" y1="9" x2="14" y2="9" />
          <line x1="5.5" y1="5.5" x2="5.5" y2="13" />
          <line x1="9.5" y1="5.5" x2="9.5" y2="13" />
        </svg>
      );

    case "table-header-col":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="13" height="12" rx="1" />
          <rect x="1" y="1" width="4.5" height="12" rx="1" fill="currentColor" fillOpacity={0.25} stroke="none" />
          <line x1="5.5" y1="1" x2="5.5" y2="13" />
          <line x1="9" y1="1" x2="9" y2="13" />
          <line x1="5.5" y1="4.5" x2="14" y2="4.5" />
          <line x1="5.5" y1="9" x2="14" y2="9" />
        </svg>
      );

    case "table-delete":
      return (
        <svg {...base} viewBox="0 0 15 14" strokeWidth={1.2}>
          <rect x="1" y="1" width="13" height="12" rx="1" />
          <line x1="1" y1="5" x2="14" y2="5" />
          <line x1="1" y1="9" x2="14" y2="9" />
          <line x1="5.5" y1="1" x2="5.5" y2="13" />
          <line x1="9.5" y1="1" x2="9.5" y2="13" />
          <line x1="4" y1="3" x2="11" y2="11" strokeWidth={1.5} />
          <line x1="11" y1="3" x2="4" y2="11" strokeWidth={1.5} />
        </svg>
      );

    default:
      return <>{name}</>;
  }
}
