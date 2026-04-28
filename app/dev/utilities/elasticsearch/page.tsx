"use client";

import { useState } from "react";
import Button from "@/lib/components/utility/Button";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD";

interface RequestResult {
  status: number;
  statusText: string;
  data: any;
  duration: number;
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "6px",
  color: "#f1f5f9",
  fontSize: "13px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "#94a3b8",
  marginBottom: "4px",
};

export default function ElasticsearchPage() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [path, setPath] = useState("_cat/indices?format=json&v=true");
  const [requestBody, setRequestBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bodyMethods: HttpMethod[] = ["POST", "PUT"];
  const showBody = bodyMethods.includes(method);

  const handleSend = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    let parsedBody: object | undefined;
    if (showBody && requestBody.trim()) {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        setError("Request body is not valid JSON.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/system/dev/elasticsearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, path, body: parsedBody }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Request failed");
      } else {
        setResult(json);
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300) return "#22c55e";
    if (status >= 400 && status < 500) return "#f59e0b";
    return "#ef4444";
  };

  const quickPaths: Array<{ label: string; method: HttpMethod; path: string; body?: string }> = [
    { label: "List indices", method: "GET", path: "_cat/indices?format=json&v=true" },
    { label: "Cluster health", method: "GET", path: "_cluster/health" },
    { label: "Node info", method: "GET", path: "_nodes?filter_path=nodes.*.name,nodes.*.version,nodes.*.os.name" },
    { label: "Search all", method: "POST", path: "_search", body: JSON.stringify({ query: { match_all: {} }, size: 10 }, null, 2) },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          margin: 0,
          color: "#f1f5f9",
          flexShrink: 0,
        }}
      >
        Elasticsearch
      </h2>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
        {quickPaths.map((q) => (
          <button
            key={q.label}
            onClick={() => {
              setMethod(q.method);
              setPath(q.path);
              if (q.body !== undefined) setRequestBody(q.body);
            }}
            style={{
              padding: "4px 10px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "4px",
              color: "#94a3b8",
              fontSize: "12px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#334155"; e.currentTarget.style.color = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Request builder */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <div style={{ flexShrink: 0 }}>
            <div style={labelStyle}>Method</div>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              style={{ ...inputStyle, width: "100px", cursor: "pointer" }}
            >
              {(["GET", "POST", "PUT", "DELETE", "HEAD"] as HttpMethod[]).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Path</div>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="index/_search"
              style={inputStyle}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <Button variant="primary" onClick={handleSend} disabled={isLoading}>
              {isLoading ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>

        {showBody && (
          <div>
            <div style={labelStyle}>Request Body (JSON)</div>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              rows={6}
              placeholder='{ "query": { "match_all": {} } }'
              style={{
                ...inputStyle,
                fontFamily: "'Courier New', monospace",
                resize: "vertical",
                lineHeight: "1.5",
              }}
            />
          </div>
        )}
      </div>

      {/* Results */}
      {(result || error) && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {result && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 12px",
                borderBottom: "1px solid #1e293b",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: statusColor(result.status),
                }}
              >
                {result.status} {result.statusText}
              </span>
              <span style={{ fontSize: "12px", color: "#475569" }}>
                {result.duration}ms
              </span>
            </div>
          )}
          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #1e293b",
                flexShrink: 0,
                fontSize: "13px",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          )}
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: "12px",
              overflowY: "auto",
              fontSize: "12px",
              color: "#e2e8f0",
              fontFamily: "'Courier New', monospace",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {result
              ? JSON.stringify(result.data, null, 2)
              : null}
          </pre>
        </div>
      )}
    </div>
  );
}
