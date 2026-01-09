"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SystemSettingsWidgetPage() {
  const params = useParams();
  const router = useRouter();
  const widgetId = params.widgetId as string;
  const [subAppId, setSubAppId] = useState<string | null>(null);
  const [mainAppId, setMainAppId] = useState<string | null>(null);
  const [widgetName, setWidgetName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptsRef = useRef<HTMLScriptElement[]>([]);

  // Fetch widget info and verify access
  useEffect(() => {
    async function fetchWidgetInfo() {
      try {
        const response = await fetch(`/api/system/widgets/${widgetId}/system`);
        if (!response.ok) {
          const error = await response.json();
          setError(error.error || "Widget not found");
          setLoading(false);
          return;
        }

        const widgetInfo = await response.json();
        // widgetInfo.appId is in format "mainAppId:subAppId"
        const fullAppId = widgetInfo.appId;
        const parts = fullAppId.split(":");
        if (parts.length !== 2) {
          setError("Invalid widget app ID format");
          setLoading(false);
          return;
        }

        setMainAppId(parts[0]);
        setSubAppId(fullAppId);
        setWidgetName(widgetInfo.component);
      } catch (err) {
        setError("Failed to load widget information");
        setLoading(false);
      }
    }

    fetchWidgetInfo();
  }, [widgetId]);

  // Load and render widget using ES modules
  useEffect(() => {
    if (!mainAppId || !widgetName) return;

    let mounted = true;
    let root: any = null;

    async function loadWidget() {
      try {
        // Wait for container to be available
        if (!containerRef.current) {
          setTimeout(loadWidget, 50);
          return;
        }

        // Load React first (required for widgets)
        async function loadReact() {
          // @ts-ignore
          if (window.React && window.ReactDOM) {
            return;
          }

          const reactScript = document.createElement("script");
          reactScript.src =
            "https://unpkg.com/react@18/umd/react.production.min.js";
          reactScript.crossOrigin = "anonymous";

          const reactDOMScript = document.createElement("script");
          reactDOMScript.src =
            "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js";
          reactDOMScript.crossOrigin = "anonymous";

          await new Promise((resolve, reject) => {
            reactScript.onload = resolve;
            reactScript.onerror = reject;
            document.body.appendChild(reactScript);
            scriptsRef.current.push(reactScript);
          });

          await new Promise((resolve, reject) => {
            reactDOMScript.onload = resolve;
            reactDOMScript.onerror = reject;
            document.body.appendChild(reactDOMScript);
            scriptsRef.current.push(reactDOMScript);
          });
        }

        await loadReact();

        if (!mounted) return;

        // Load app as ES module
        const scriptId = `widget-${mainAppId}-${Date.now()}`;
        const moduleSrc = `/api/system/apps/${mainAppId}/assets/`;

        const script = document.createElement("script");
        script.id = scriptId;
        script.type = "module";
        script.textContent = `
          import * as appModule from "${moduleSrc}";
          window.__WIDGET_MODULE_${scriptId.replace(/-/g, "_")} = appModule;
        `;

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
          scriptsRef.current.push(script);
        });

        if (!mounted) return;

        // Access the imported module
        // @ts-ignore
        const appModule = window[`__WIDGET_MODULE_${scriptId.replace(/-/g, "_")}`];

        if (!appModule?.widgets?.[widgetName]) {
          setError(`Widget "${widgetName}" not found in app module`);
          setLoading(false);
          return;
        }

        // Render the widget using ReactDOM from the global scope
        const WidgetComponent = appModule.widgets[widgetName];

        // @ts-ignore - Use the global React and ReactDOM
        const { createElement } = window.React;
        const { createRoot } = window.ReactDOM;

        root = createRoot(containerRef.current!);
        root.render(createElement(WidgetComponent));

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading widget:", err);
        if (mounted) {
          setError(
            `Failed to load widget: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          setLoading(false);
        }
      }
    }

    loadWidget();

    return () => {
      mounted = false;

      // Unmount the React root if it was created
      if (root) {
        try {
          root.unmount();
        } catch (err) {
          console.error("Error unmounting widget:", err);
        }
      }

      // Cleanup scripts
      scriptsRef.current.forEach((script) => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, [mainAppId, widgetName]);

  return (
    <>
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => router.push("/system/settings/apps")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Apps
        </button>
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
          }}
        >
          <div style={{ color: "#94a3b8" }}>Loading widget...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "32px" }}>
          <div
            style={{
              background: "rgba(127, 29, 29, 0.2)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <h3
              style={{
                color: "#f87171",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              Error
            </h3>
            <p style={{ color: "#fca5a5", fontSize: "14px" }}>{error}</p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        style={{ display: loading || error ? "none" : "block" }}
      />
    </>
  );
}
