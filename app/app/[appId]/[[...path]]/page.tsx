"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Navigation from "@/lib/components/Navigation/Navigation";
import Tabset from "@/lib/components/Tabset/Tabset";

interface TabsetItem {
  label: string;
  path?: string;
}

export default function AppPage() {
  const params = useParams();
  // Decode the URL parameter to convert %3A back to :
  const fullAppId = decodeURIComponent(params.appId as string);
  const path = (params.path as string[]) || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{
    displayName: string;
    profilePicture?: string;
    isAdmin: boolean;
  } | null>(null);
  const [userSubApps, setUserSubApps] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [authorizations, setAuthorizations] = useState<string[]>([]);
  const [isAssumedIdentity, setIsAssumedIdentity] = useState(false);
  const [brandName, setBrandName] = useState("Applicator");
  const [brandIcon, setBrandIcon] = useState<string | undefined>(undefined);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [subAppComponent, setSubAppComponent] = useState<string | null>(null);
  const [homeMenuItems, setHomeMenuItems] = useState<TabsetItem[]>([]);

  // Parse main app ID and sub-app ID from URL
  const mainAppId = fullAppId.includes(":")
    ? fullAppId.split(":")[0]
    : fullAppId;
  const subAppId = fullAppId.includes(":")
    ? fullAppId.split(":")[1]
    : path[0] || "main";
  const remainingPath = fullAppId.includes(":") ? path : path.slice(1);

  // Fetch user data
  useEffect(() => {
    fetch("/api/system/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser({
            displayName: data.user.displayName,
            profilePicture: data.user.profilePicture,
            isAdmin: data.user.isAdmin || false,
          });
          setUserSubApps(data.userSubApps || []);
          setAuthorizations(data.authorizations || []);
          setIsAssumedIdentity(data.isAssumedIdentity || false);

          // Build home menu items
          const menuItems: TabsetItem[] = [
            {
              label: "Home",
              path: "/",
            },
          ];

          // Add user's accessible sub-apps as tabs
          if (data.userSubApps) {
            for (const subApp of data.userSubApps) {
              menuItems.push({
                label: subApp.label,
                path: `/app/${subApp.id}`,
              });
            }
          }

          setHomeMenuItems(menuItems);
        }
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
      });
  }, []);

  // Fetch brand settings
  useEffect(() => {
    fetch("/api/system/settings/brand")
      .then((res) => res.json())
      .then((data) => {
        setBrandName(data.brandName || "Applicator");
        setBrandIcon(data.brandIcon);
      })
      .catch((err) => {
        console.error("Error fetching brand settings:", err);
      });
  }, []);

  // Fetch app metadata and check authorization
  useEffect(() => {
    if (!fullAppId || !user || userSubApps.length === 0) {
      // Wait until we have the user's sub-apps loaded
      return;
    }

    // Check if user has access to this sub-app
    const hasAccess = userSubApps.some((app) => app.id === fullAppId);

    if (!hasAccess) {
      setError(`Access denied: You do not have permission to access this app`);
      setLoading(false);
      return;
    }

    // Fetch main app metadata
    fetch(`/api/system/apps/${mainAppId}`)
      .then((res) => {
        if (res.status === 404) {
          setError(`App "${mainAppId}" does not exist`);
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.version) {
          // Format version object to string (e.g., "1.0.0")
          const versionString = `${data.version.major}.${data.version.minor}.${data.version.dev}`;
          setAppVersion(versionString);

          // Find the sub-app to get component name
          const subApp = data.subApps?.find((sa: any) => sa.id === subAppId);
          if (!subApp) {
            setError(`Sub-app "${subAppId}" not found in app "${mainAppId}"`);
            setLoading(false);
            return;
          }

          setSubAppComponent(subApp.component);
        }
      })
      .catch((err) => {
        console.error("Error fetching app metadata:", err);
        setError("Failed to load app");
        setLoading(false);
      });
  }, [fullAppId, mainAppId, subAppId, user, userSubApps]);

  // Load and mount sub-app using ES modules
  useEffect(() => {
    if (!mainAppId || !appVersion || !subAppComponent || !containerRef.current)
      return;

    let mounted = true;
    const scripts: HTMLScriptElement[] = [];

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
        reactScript.src = "/assets/react.production.min.js";
        reactScript.onload = () => {
          const reactDOMScript = document.createElement("script");
          reactDOMScript.src = "/assets/react-dom.production.min.js";
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
        if (!document.querySelector('script[type="importmap"]')) {
          // Create shim modules that re-export all React properties
          const reactShimCode = `
            const React = window.React;
            export default React;
            export const {
              Component, PureComponent, memo, forwardRef,
              createContext, useContext, useState, useEffect,
              useLayoutEffect, useReducer, useCallback, useMemo,
              useRef, useImperativeHandle, useDebugValue,
              createElement, cloneElement, createFactory,
              isValidElement, Children, Fragment, StrictMode,
              Suspense, lazy, startTransition, useTransition,
              useDeferredValue, useId, useSyncExternalStore
            } = React;
          `;

          const reactDOMShimCode = `
            const ReactDOM = window.ReactDOM;
            export default ReactDOM;
            export const { render, hydrate, unmountComponentAtNode, findDOMNode, createPortal, flushSync } = ReactDOM;
          `;

          const importMap = document.createElement("script");
          importMap.type = "importmap";
          importMap.textContent = JSON.stringify({
            imports: {
              React: "data:text/javascript;base64," + btoa(reactShimCode),
              ReactDOM: "data:text/javascript;base64," + btoa(reactDOMShimCode),
              react: "data:text/javascript;base64," + btoa(reactShimCode),
              "react-dom":
                "data:text/javascript;base64," + btoa(reactDOMShimCode),
            },
          });
          document.head.prepend(importMap); // Use prepend to ensure it's first
          scripts.push(importMap);
        }

        // Create unique script ID to avoid conflicts
        const scriptId = `app-${mainAppId}-${Date.now()}`;
        const moduleSrc = `/api/system/apps/${mainAppId}/assets/?v=${appVersion}`;
        const moduleVarName = `__APP_MODULE_${scriptId.replace(/-/g, "_")}`;

        // Create script element with type="module"
        const script = document.createElement("script");
        script.id = scriptId;
        script.type = "module";
        script.textContent = `
          import * as appModule from "${moduleSrc}";
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

              if (!appModule || !appModule.apps) {
                console.error("App module structure:", appModule);
                setError("App does not export apps registry");
                setLoading(false);
                return;
              }

              // Get the sub-app component
              const SubAppComponent = appModule.apps[subAppComponent];
              if (!SubAppComponent) {
                setError(
                  `Component "${subAppComponent}" not found in app module`
                );
                setLoading(false);
                return;
              }

              // Verify React is loaded
              // @ts-ignore
              if (!window.React || !window.ReactDOM) {
                setError("React libraries not loaded");
                setLoading(false);
                return;
              }

              // Create React root and render using window.ReactDOM
              if (containerRef.current) {
                // Use ReactDOM from window for compatibility
                // @ts-ignore
                const { createRoot: windowCreateRoot } = window.ReactDOM;
                const root = windowCreateRoot(containerRef.current);
                rootRef.current = root;

                // @ts-ignore - SubAppComponent is dynamically loaded
                root.render(
                  // @ts-ignore
                  window.React.createElement(SubAppComponent, {
                    path: remainingPath,
                    appId: fullAppId,
                  })
                );

                setLoading(false);
              }
            } catch (err) {
              console.error("Error mounting sub-app:", err);
              setError("Failed to mount sub-app");
              setLoading(false);
            }
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          // @ts-ignore
          if (!window[`${moduleVarName}_loaded`]) {
            setError("App module loading timeout");
            setLoading(false);
          }
        }, 10000);
      } catch (err) {
        console.error("Error loading dependencies:", err);
        setError("Failed to load app dependencies");
        setLoading(false);
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
  }, [mainAppId, appVersion, subAppComponent, fullAppId, remainingPath]);

  return (
    <>
      <Navigation
        displayName={user?.displayName || ""}
        profilePicture={user?.profilePicture}
        isAdmin={user?.isAdmin || false}
        brandName={brandName}
        brandIcon={brandIcon}
        authorizations={authorizations}
        isAssumedIdentity={isAssumedIdentity}
      />
      <div
        style={{
          position: "fixed",
          top: "64px",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#0f172a",
        }}
      >
        <Tabset items={homeMenuItems} variant="horizontal" />
        <main
          style={{
            position: "absolute",
            top: "49px",
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "auto",
          }}
        >
          <div style={{ height: "100%" }}>
            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "256px",
                }}
              >
                <div style={{ color: "#94a3b8" }}>Loading app...</div>
              </div>
            )}

            {error && (
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
                  <p
                    style={{ color: "#fca5a5", fontSize: "16px", margin: "0" }}
                  >
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div ref={containerRef} style={{ height: "100%" }} />
          </div>
        </main>
      </div>
    </>
  );
}
