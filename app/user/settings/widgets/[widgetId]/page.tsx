"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

export default function AppWidgetPage() {
  const params = useParams();
  const widgetId = params.widgetId as string;
  const [appId, setAppId] = useState<string | null>(null);
  const [widgetName, setWidgetName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptsRef = useRef<HTMLScriptElement[]>([]);

  // Fetch widget info and verify access
  useEffect(() => {
    async function fetchWidgetInfo() {
      try {
        const response = await fetch(
          `/api/system/apps/${appId}/widgets/${widgetId}`
        );
        if (!response.ok) {
          const errorData = await response.json();

          // Handle different error types
          if (response.status === 403) {
            setError(
              "Access denied: You do not have permission to access this widget"
            );
          } else if (response.status === 404) {
            setError(`Widget "${widgetId}" does not exist`);
          } else {
            setError(errorData.error || "Widget not found");
          }

          setLoading(false);
          return;
        }

        const widgetInfo = await response.json();
        setAppId(widgetInfo.appId);
        setWidgetName(widgetInfo.component);
      } catch (err) {
        setError("Failed to load widget information");
        setLoading(false);
      }
    }

    fetchWidgetInfo();
  }, [widgetId]);

  // Load and render widget once we have appId and widgetName
  useEffect(() => {
    if (!appId || !widgetName) return;

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

        // Check if app is already loaded
        // @ts-ignore
        let appExports = window.__APPLICATOR_PLUGINS__?.[appId];

        if (!appExports) {
          // Load the app script
          const script = document.createElement("script");
          script.src = `/api/system/apps/${appId}/assets`;

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
            scriptsRef.current.push(script);
          });

          // @ts-ignore
          appExports = window.__APPLICATOR_PLUGINS__?.[appId];
        }

        if (!mounted) return;

        if (!appExports?.widgets?.[widgetName]) {
          setError(`Widget not found`);
          setLoading(false);
          return;
        }

        // Render the widget using ReactDOM from the global scope
        const WidgetComponent = appExports.widgets[widgetName];

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
          document.body.removeChild(script);
        }
      });
    };
  }, [appId, widgetName]);

  return (
    <>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
          }}
        >
          <div
            style={{
              background: "#7f1d1d",
              border: "1px solid #991b1b",
              borderRadius: "8px",
              padding: "32px",
              maxWidth: "500px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#fca5a5", fontSize: "16px", margin: "0" }}>
              {error}
            </p>
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
