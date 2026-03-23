import React, { useState } from "react";
import ButtonIcon from "../ButtonIcon";
import ButtonMenu from "../ButtonMenu";
import Button from "../Button";
import Icon from "../Icon";

import hljs from "highlight.js/lib/core";
import "highlight.js/styles/atom-one-dark.css";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import cssLang from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import markdown from "highlight.js/lib/languages/markdown";
import bash from "highlight.js/lib/languages/bash";
import yaml from "highlight.js/lib/languages/yaml";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import ruby from "highlight.js/lib/languages/ruby";
import php from "highlight.js/lib/languages/php";
import csharp from "highlight.js/lib/languages/csharp";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";
import r from "highlight.js/lib/languages/r";
import lua from "highlight.js/lib/languages/lua";
import perl from "highlight.js/lib/languages/perl";
import scala from "highlight.js/lib/languages/scala";
import ini from "highlight.js/lib/languages/ini";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import makefile from "highlight.js/lib/languages/makefile";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("css", cssLang);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", c);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("php", php);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("r", r);
hljs.registerLanguage("lua", lua);
hljs.registerLanguage("perl", perl);
hljs.registerLanguage("scala", scala);
hljs.registerLanguage("ini", ini);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("makefile", makefile);

export interface PreviewAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export interface FilePreviewProps {
  /** The file name (used for type detection and display). */
  fileName: string;
  /** The file path passed back to `getPreviewUrl` and `fetchTextContent`. */
  filePath: string;
  /** Returns a URL for image/PDF/audio/video preview. May return a blob URL. */
  getPreviewUrl: (filePath: string) => Promise<string> | string;
  /** Fetches text content for text file preview. */
  fetchTextContent: (filePath: string) => Promise<string>;
  /** Called when the modal is closed. */
  onClose: () => void;
  /** Optional file actions shown in an Actions menu in the header. */
  actions?: PreviewAction[];
  /** Navigate to the previous file. */
  onPrev?: () => void;
  /** Navigate to the next file. */
  onNext?: () => void;
  /** Whether a previous file exists (disables the prev button when false). */
  hasPrev?: boolean;
  /** Whether a next file exists (disables the next button when false). */
  hasNext?: boolean;
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
const TEXT_EXTS = [
  "txt", "md", "json", "js", "ts", "tsx", "jsx", "css", "html", "xml",
  "log", "csv", "sql", "py", "java", "c", "cpp", "h", "hpp", "cs", "yaml",
  "yml", "sh", "bash", "rb", "go", "rs", "php", "swift", "kt", "r", "lua",
  "pl", "scala", "toml", "ini", "dockerfile", "makefile",
];
const PDF_EXTS = ["pdf"];
const AUDIO_EXTS = ["mp3", "ogg", "wav"];
const VIDEO_EXTS = ["mp4", "mkv", "mov"];

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", sql: "sql", css: "css", html: "xml", xml: "xml",
  json: "json", java: "java", cpp: "cpp", hpp: "cpp", c: "c", h: "c",
  md: "markdown", sh: "bash", bash: "bash", yaml: "yaml", yml: "yaml",
  go: "go", rs: "rust", rb: "ruby", php: "php", cs: "csharp",
  swift: "swift", kt: "kotlin", r: "r", lua: "lua", pl: "perl",
  scala: "scala", ini: "ini", toml: "ini", dockerfile: "dockerfile",
  makefile: "makefile",
};

function getLanguage(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_LANG[ext] || null;
}

export function getPreviewType(
  fileName: string,
): "image" | "text" | "pdf" | "audio" | "video" | "unsupported" {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (PDF_EXTS.includes(ext)) return "pdf";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (TEXT_EXTS.includes(ext)) return "text";
  return "unsupported";
}

export function isPreviewSupported(fileName: string): boolean {
  return getPreviewType(fileName) !== "unsupported";
}

export default function FilePreview({
  fileName,
  filePath,
  getPreviewUrl,
  fetchTextContent,
  onClose,
  actions,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: FilePreviewProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wordWrap, setWordWrap] = useState(false);

  const previewType = getPreviewType(fileName);
  const language = getLanguage(fileName);

  React.useEffect(() => {
    let revokeBlobUrl: string | null = null;
    setTextContent(null);
    setPreviewUrl("");
    setError("");

    if (previewType === "text") {
      setLoading(true);
      fetchTextContent(filePath)
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load file preview");
          setLoading(false);
        });
    } else if (
      previewType === "image" ||
      previewType === "pdf" ||
      previewType === "audio" ||
      previewType === "video"
    ) {
      setLoading(true);
      Promise.resolve(getPreviewUrl(filePath))
        .then((url) => {
          setPreviewUrl(url);
          if (url.startsWith("blob:")) revokeBlobUrl = url;
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load file preview");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      if (revokeBlobUrl) URL.revokeObjectURL(revokeBlobUrl);
    };
  }, [filePath, previewType]);

  const highlightedHtml = React.useMemo(() => {
    if (textContent === null || !language) return null;
    try {
      return hljs.highlight(textContent, { language }).value;
    } catch {
      return null;
    }
  }, [textContent, language]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#0f172a",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          background: "#1e293b",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1 }}>
          <h3
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "14px",
              fontWeight: "normal",
            }}
          >
            Preview
          </h3>
          <h2
            style={{
              margin: 0,
              color: "#f1f5f9",
              fontSize: "18px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={fileName}
          >
            {fileName}
          </h2>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          {(onPrev || onNext) && (
            <>
              <ButtonIcon
                name="chevron-left"
                label="Previous file"
                onClick={onPrev ?? (() => {})}
                disabled={!hasPrev}
                variant="bordered"
              />
              <ButtonIcon
                name="chevron-right"
                label="Next file"
                onClick={onNext ?? (() => {})}
                disabled={!hasNext}
                variant="bordered"
              />
            </>
          )}
          {previewType === "text" && (
            <ButtonIcon
              name="word-wrap"
              label={wordWrap ? "Disable word wrap" : "Enable word wrap"}
              onClick={() => setWordWrap((v) => !v)}
              variant="bordered"
              subvariant={wordWrap ? "info" : "neutral"}
            />
          )}
          {actions && actions.length > 0 && (
            <ButtonMenu
              alignment="right"
              popover="Actions"
              trigger={
                <Button variant="ghost">
                  <Icon name="sandwich" size={16} />
                </Button>
              }
              options={actions}
            />
          )}
          <ButtonIcon name="close" label="Close" onClick={onClose} variant="bordered" />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: previewType === "text" ? "flex-start" : "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        {loading && <span style={{ color: "#94a3b8" }}>Loading preview...</span>}
        {error && <span style={{ color: "#ef4444" }}>{error}</span>}
        {!loading && !error && previewType === "image" && previewUrl && (
          <img
            src={previewUrl}
            alt={fileName}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        )}
        {!loading && !error && previewType === "audio" && previewUrl && (
          <audio src={previewUrl} controls style={{ width: "100%", maxWidth: "600px" }} />
        )}
        {!loading && !error && previewType === "video" && previewUrl && (
          <video src={previewUrl} controls style={{ maxWidth: "100%", maxHeight: "100%" }} />
        )}
        {!loading && !error && previewType === "pdf" && previewUrl && (
          <iframe
            src={`${previewUrl}#view=FitH`}
            style={{ width: "100%", height: "100%", border: "none" }}
            title={fileName}
          />
        )}
        {!loading && !error && previewType === "text" && textContent !== null && (
          highlightedHtml ? (
            <pre
              style={{
                margin: 0,
                fontSize: "14px",
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                width: "100%",
                maxWidth: "1200px",
                overflow: "visible",
                background: "transparent",
                lineHeight: "1.6",
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordBreak: wordWrap ? "break-word" : "normal",
              }}
            >
              <code
                className="hljs"
                style={{ background: "transparent" }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </pre>
          ) : (
            <pre
              style={{
                margin: 0,
                color: "#e2e8f0",
                fontSize: "14px",
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordBreak: wordWrap ? "break-word" : "normal",
                width: "100%",
                maxWidth: "1200px",
                overflow: "visible",
                lineHeight: "1.6",
              }}
            >
              {textContent}
            </pre>
          )
        )}
      </div>
    </div>
  );
}
