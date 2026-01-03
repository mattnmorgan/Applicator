"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Navigation from "@/lib/components/Navigation/Navigation";
import AppMenu from "@/lib/components/AppMenu/AppMenu";

export default function AppPage() {
  const params = useParams();
  const appId = params.appId as string;
  const path = (params.path as string[]) || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{
    displayName: string;
    profilePicture?: string;
    isAdmin: boolean;
  } | null>(null);
  const [brandName, setBrandName] = useState("Applicator");
  const [brandIcon, setBrandIcon] = useState<string | undefined>(undefined);
  const [appVersion, setAppVersion] = useState<string | null>(null);

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
        }
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
      });
  }, []);

  // Fetch brand settings
  useEffect(() => {
    fetch("/api/system/brand")
      .then((res) => res.json())
      .then((data) => {
        setBrandName(data.brandName || "Applicator");
        setBrandIcon(data.brandIcon);
      })
      .catch((err) => {
        console.error("Error fetching brand settings:", err);
      });
  }, []);

  // Fetch app version
  useEffect(() => {
    if (!appId) return;

    fetch(`/api/system/apps/${appId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.version) {
          setAppVersion(data.version);
        }
      })
      .catch((err) => {
        console.error("Error fetching app version:", err);
      });
  }, [appId]);

  useEffect(() => {
    if (!appId || !appVersion) return;

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

    // Load the app bundle after React is ready
    const loadApp = async () => {
      try {
        await loadReact();

        // Give React a moment to fully initialize
        await new Promise(resolve => setTimeout(resolve, 50));

        const script = document.createElement("script");
        script.src = `/api/system/assets/apps/${appId}?v=${appVersion}`;
        script.async = true;

        script.onload = () => {
          try {
            // Access the app from the global plugin namespace
            // @ts-ignore
            const appExports = window.__APPLICATOR_PLUGINS__?.[appId];

            if (
              appExports?.AppMount &&
              typeof appExports.AppMount === "function"
            ) {
              // Pass the path to the app
              appExports.AppMount(containerRef.current, { appId, path });
              setLoading(false);
            } else {
              console.error("App export structure:", appExports);
              setError(
                "App does not export a mount function in __APPLICATOR_PLUGINS__"
              );
              setLoading(false);
            }
          } catch (err) {
            console.error("Error mounting app:", err);
            setError("Failed to mount app");
            setLoading(false);
          }
        };

        script.onerror = () => {
          setError("Failed to load app");
          setLoading(false);
        };

        document.body.appendChild(script);
        scripts.push(script);
      } catch (err) {
        console.error("Error loading dependencies:", err);
        setError("Failed to load app dependencies");
        setLoading(false);
      }
    };

    loadApp();

    return () => {
      // Cleanup: unmount the app if it provides an unmount function
      try {
        // @ts-ignore
        const appExports = window.__APPLICATOR_PLUGINS__?.[appId];
        if (
          appExports?.AppUnmount &&
          typeof appExports.AppUnmount === "function"
        ) {
          appExports.AppUnmount();
        }
      } catch (err) {
        console.error("Error unmounting app:", err);
      }

      // Remove all scripts
      scripts.forEach((script) => {
        if (script.parentNode) {
          document.body.removeChild(script);
        }
      });
    };
  }, [appId, appVersion, path]);

  return (
    <>
      <Navigation
        displayName={user?.displayName || ""}
        profilePicture={user?.profilePicture}
        isAdmin={user?.isAdmin || false}
        brandName={brandName}
        brandIcon={brandIcon}
      />
      <AppMenu />
      <div
        style={{
          position: "fixed",
          top: "113px",
          bottom: "0",
          left: "0",
          right: "0",
        }}
      >
        <div style={{ height: "100%" }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
              <div style={{ color: '#94a3b8' }}>
                Loading app...
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: '8px', padding: '16px' }}>
              <p style={{ color: '#fca5a5' }}>{error}</p>
            </div>
          )}

          <div ref={containerRef} style={{ height: "100%" }} />
        </div>
      </div>
    </>
  );
}
