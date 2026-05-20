"use client";

import { useEffect, useRef, useState } from "react";

interface DynamicAppLoaderProps {
  /** URL to the app module to load */
  moduleUrl: string;
  /** Name of the component to render from the app's exports */
  componentName: string;
  /** Props to pass to the loaded component */
  componentProps?: Record<string, any>;
  /** URL to React library (defaults to /assets/react.production.min.js) */
  reactUrl?: string;
  /** URL to ReactDOM library (defaults to /assets/react-dom.production.min.js) */
  reactDomUrl?: string;
  /** Callback when loading completes successfully */
  onLoad?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

export default function DynamicAppLoader({
  moduleUrl,
  componentName,
  componentProps = {},
  reactUrl = "/assets/react.production.min.js",
  reactDomUrl = "/assets/react-dom.production.min.js",
  onLoad,
  onError,
}: DynamicAppLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const scripts: HTMLScriptElement[] = [];

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
      if (onError) onError(errorMessage);
    };

    // Load React and ReactDOM first
    const loadReact = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if React is already loaded
        // @ts-ignore
        if (window.React && window.ReactDOM) {
          resolve();
          return;
        }

        const reactScript = document.createElement("script");
        reactScript.src = reactUrl;
        reactScript.onload = () => {
          const reactDOMScript = document.createElement("script");
          reactDOMScript.src = reactDomUrl;
          reactDOMScript.onload = () => resolve();
          reactDOMScript.onerror = () =>
            reject(new Error("Failed to load ReactDOM"));
          document.body.appendChild(reactDOMScript);
          scripts.push(reactDOMScript);
        };
        reactScript.onerror = () => reject(new Error("Failed to load React"));
        document.body.appendChild(reactScript);
        scripts.push(reactScript);
      });
    };

    // Load the app bundle as ES module
    const loadApp = async () => {
      try {
        await loadReact();

        if (!mounted) return;

        // Add import map for React and ReactDOM (must be added BEFORE any module scripts)
        // Only create the import map once globally
        if (!document.querySelector('script[type="importmap"][data-react-shim]')) {
          // Create shim modules that re-export all React properties
          const reactShimCode = `
            const React = window.React;
            export default React;
            export const {
              Component, PureComponent, memo, forwardRef,
              createContext, useContext, useState, useEffect,
              useLayoutEffect, useInsertionEffect, useReducer, useCallback, useMemo,
              useRef, createRef, useImperativeHandle, useDebugValue,
              createElement, cloneElement, createFactory,
              isValidElement, Children, Fragment, StrictMode,
              Suspense, lazy, startTransition, useTransition,
              useDeferredValue, useId, useSyncExternalStore,
              __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
            } = React;
          `;

          const reactDOMShimCode = `
            const ReactDOM = window.ReactDOM;
            export default ReactDOM;
            export const { render, hydrate, unmountComponentAtNode, findDOMNode, createPortal, flushSync, unstable_batchedUpdates } = ReactDOM;
          `;

          const importMap = document.createElement("script");
          importMap.type = "importmap";
          importMap.setAttribute("data-react-shim", "true");
          importMap.textContent = JSON.stringify({
            imports: {
              "React": "data:text/javascript;base64," + btoa(reactShimCode),
              "ReactDOM": "data:text/javascript;base64," + btoa(reactDOMShimCode),
              "react": "data:text/javascript;base64," + btoa(reactShimCode),
              "react-dom": "data:text/javascript;base64," + btoa(reactDOMShimCode),
            },
          });
          document.head.prepend(importMap);
          // Note: We don't add this to scripts array since it should persist globally
        }

        // Create unique script ID to avoid conflicts
        const scriptId = `app-loader-${crypto.randomUUID().replace(/-/g, "")}`;
        const moduleVarName = `__APP_MODULE_${scriptId.replace(/-/g, "_")}`;

        // Create script element with type="module"
        const script = document.createElement("script");
        script.id = scriptId;
        script.type = "module";
        script.textContent = `
          import * as appModule from "${moduleUrl}";
          window.${moduleVarName} = appModule;
          window.${moduleVarName}_loaded = true;
        `;

        document.head.appendChild(script);
        scripts.push(script);

        // Poll for module to be loaded (inline module scripts don't fire onload)
        const pollInterval = setInterval(() => {
          // @ts-ignore
          if (window[`${moduleVarName}_loaded`]) {
            clearInterval(pollInterval);

            try {
              if (!mounted || !containerRef.current) return;

              // Access the imported module
              // @ts-ignore
              const appModule = window[moduleVarName];

              // Get the component as a direct named export
              if (!appModule) {
                console.error("App module is null or undefined");
                handleError("Failed to load app module");
                return;
              }

              const AppComponent = appModule[componentName];

              if (!AppComponent) {
                console.error("App module structure:", appModule);
                console.error("Looking for component:", componentName);
                handleError(`Component "${componentName}" not found in app module`);
                return;
              }

              // Verify React is loaded
              // @ts-ignore
              if (!window.React || !window.ReactDOM) {
                handleError("React libraries not loaded");
                return;
              }

              // Create React root and render using window.ReactDOM
              if (containerRef.current) {
                // Use ReactDOM from window for compatibility
                // @ts-ignore
                const { createRoot: windowCreateRoot } = window.ReactDOM;
                const root = windowCreateRoot(containerRef.current);
                rootRef.current = root;

                // @ts-ignore - AppComponent is dynamically loaded
                root.render(
                  // @ts-ignore
                  window.React.createElement(AppComponent, componentProps)
                );

                if (onLoad) onLoad();
              }
            } catch (err) {
              console.error("Error mounting app:", err);
              handleError("Failed to mount app");
            }
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          // @ts-ignore
          if (!window[`${moduleVarName}_loaded`]) {
            handleError("App module loading timeout");
          }
        }, 10000);
      } catch (err) {
        console.error("Error loading dependencies:", err);
        handleError("Failed to load app dependencies");
      }
    };

    loadApp();

    return () => {
      mounted = false;

      // Unmount React root
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }

      // Remove all scripts
      scripts.forEach((script) => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, [moduleUrl, componentName, reactUrl, reactDomUrl, onLoad, onError]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
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
    );
  }

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
