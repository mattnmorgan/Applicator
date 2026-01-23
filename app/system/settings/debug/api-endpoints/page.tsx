"use client";

import { useState } from "react";
import { redirectToFirstTimeSetup, redirectToLogin } from "@/lib/client/setup";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  timestamp: string;
}

export default function ApiEndpointsPage() {
  redirectToFirstTimeSetup().then(() => {
    redirectToLogin();
  });
  const [url, setUrl] = useState("/api/");
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [requestBody, setRequestBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const startTime = performance.now();

    try {
      // Validate request body if provided
      let parsedBody = null;
      if (requestBody.trim()) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          setError("Invalid JSON in request body");
          setIsLoading(false);
          return;
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (parsedBody) {
        fetchOptions.body = JSON.stringify(parsedBody);
      }

      const response = await fetch(url, fetchOptions);
      const endTime = performance.now();

      // Extract headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Get response body
      const contentType = response.headers.get("content-type");
      let responseBody: string;

      if (contentType?.includes("application/json")) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await response.text();
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        headers,
        body: responseBody,
        duration: Math.round(endTime - startTime),
        timestamp: new Date().toLocaleString(),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "#34d399"; // green
    if (status >= 300 && status < 400) return "#3b82f6"; // blue
    if (status >= 400 && status < 500) return "#fbbf24"; // amber
    return "#ef4444"; // red
  };

  const methodColors: Record<HttpMethod, string> = {
    GET: "#3b82f6",
    POST: "#34d399",
    PUT: "#fbbf24",
    PATCH: "#8b5cf6",
    DELETE: "#ef4444",
  };

  return (
    <div>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#f1f5f9",
          marginBottom: "8px",
        }}
      >
        API Endpoints
      </h1>

      <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "14px" }}>
        Test API endpoints by specifying the URL, request method, and request
        body.
      </p>

      <div
        style={{
          display: "flex",
          gap: "20px",
          height: "calc(100vh - 280px)",
        }}
      >
        {/* Input Column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h2
              style={{
                color: "#f1f5f9",
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              Request Configuration
            </h2>

            {/* URL Input */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/api/your-endpoint"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#1e293b",
                  color: "#f1f5f9",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Method Selection */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Method
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {(
                  ["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]
                ).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    style={{
                      padding: "8px 16px",
                      background: method === m ? methodColors[m] : "#1e293b",
                      color: method === m ? "#fff" : "#94a3b8",
                      border: `1px solid ${
                        method === m ? methodColors[m] : "#334155"
                      }`,
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (method !== m) {
                        e.currentTarget.style.background = "#334155";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (method !== m) {
                        e.currentTarget.style.background = "#1e293b";
                      }
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Request Body */}
            <div>
              <label
                style={{
                  display: "block",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Request Body (JSON)
              </label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{\n  "key": "value"\n}'
                style={{
                  width: "100%",
                  minHeight: "200px",
                  padding: "12px",
                  background: "#1e293b",
                  color: "#f1f5f9",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  resize: "vertical",
                  lineHeight: "1.5",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !url.trim()}
              style={{
                marginTop: "16px",
                padding: "12px 24px",
                background: isLoading || !url.trim() ? "#334155" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: isLoading || !url.trim() ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && url.trim()) {
                  e.currentTarget.style.background = "#2563eb";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && url.trim()) {
                  e.currentTarget.style.background = "#3b82f6";
                }
              }}
            >
              {isLoading ? "Sending Request..." : "Send Request"}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              borderRadius: "8px",
              padding: "20px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2
              style={{
                color: "#f1f5f9",
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              Results
            </h2>

            {!result && !error && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                Results will appear here after sending a request
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: "16px",
                  background: "#ef444420",
                  border: "1px solid #ef4444",
                  borderRadius: "6px",
                  color: "#f87171",
                  fontSize: "14px",
                }}
              >
                <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                  Error
                </div>
                {error}
              </div>
            )}

            {result && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  overflowY: "auto",
                }}
              >
                {/* Status and Metadata */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#1e293b",
                    borderRadius: "6px",
                    border: "1px solid #334155",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: getStatusColor(result.status),
                      }}
                    >
                      {result.status}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                      {result.statusText}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    <span>Duration: {result.duration}ms</span>
                    <span>Time: {result.timestamp}</span>
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <div
                    style={{
                      color: "#e2e8f0",
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Headers
                  </div>
                  <div
                    style={{
                      padding: "12px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      maxHeight: "150px",
                      overflowY: "auto",
                    }}
                  >
                    {Object.entries(result.headers).map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          marginBottom: "4px",
                          color: "#94a3b8",
                        }}
                      >
                        <span style={{ color: "#3b82f6" }}>{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div
                  style={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  <div
                    style={{
                      color: "#e2e8f0",
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Response Body
                  </div>
                  <pre
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      overflowY: "auto",
                      color: "#f1f5f9",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {result.body || "(empty)"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
