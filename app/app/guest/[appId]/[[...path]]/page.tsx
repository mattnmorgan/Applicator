"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import DynamicAppLoader from "@/lib/components/utility/DynamicAppLoader";

export default function GuestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const appId = decodeURIComponent(params.appId as string);
  const path = (params.path as string[]) || [];
  const contextId = searchParams.get("context");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const [contextData, setContextData] = useState<any>(null);
  const [appletComponent, setAppletComponent] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [moduleUrl, setModuleUrl] = useState<string | null>(null);
  const [validatedPassword, setValidatedPassword] = useState<string | null>(
    null,
  );

  const validate = async (pw?: string) => {
    try {
      const body: { contextId: string; password?: string } = { contextId };
      if (pw) {
        body.password = pw;
      }

      const response = await fetch(`/api/guest/${appId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError(data.error || "App not found");
        } else if (response.status === 403) {
          if (pw) {
            setPasswordError("Incorrect password");
            setSubmittingPassword(false);
            return;
          }
          setError(data.error || "Access denied");
        } else {
          setError(data.error || "Failed to validate access");
        }
        setLoading(false);
        return;
      }

      if (data.requiresPassword && !pw) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      if (!data.valid) {
        setError("Invalid link");
        setLoading(false);
        return;
      }

      if (!data.appletComponent) {
        setError("This app does not have a guest viewer");
        setLoading(false);
        return;
      }

      setContextData(data.contextData);
      setAppletComponent(data.appletComponent);
      setAppVersion(data.appVersion);
      setModuleUrl(`/api/${appId}/assets/source?v=${data.appVersion}`);
      if (pw) {
        setValidatedPassword(pw);
      }
      setRequiresPassword(false);
      setLoading(false);
    } catch {
      setError("Failed to validate guest access");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!contextId) {
      setError("Invalid link — no context provided");
      setLoading(false);
      return;
    }
    validate();
  }, [contextId, appId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmittingPassword(true);
    setPasswordError(null);
    await validate(password);
    setSubmittingPassword(false);
  };

  // Password form
  if (requiresPassword) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "12px",
            padding: "32px",
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: "20px",
              fontWeight: 600,
              color: "#f1f5f9",
            }}
          >
            Password Required
          </h2>
          <p
            style={{
              margin: "0 0 24px 0",
              fontSize: "14px",
              color: "#94a3b8",
            }}
          >
            This shared content is password-protected.
          </p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#0f172a",
                border: `1px solid ${passwordError ? "#ef4444" : "#334155"}`,
                borderRadius: "6px",
                color: "#f1f5f9",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {passwordError && (
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: "13px",
                  color: "#ef4444",
                }}
              >
                {passwordError}
              </p>
            )}
            <button
              type="submit"
              disabled={submittingPassword || !password.trim()}
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "10px",
                background: submittingPassword ? "#1e40af" : "#3b82f6",
                color: "#f1f5f9",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: submittingPassword ? "not-allowed" : "pointer",
                opacity: !password.trim() ? 0.5 : 1,
              }}
            >
              {submittingPassword ? "Verifying..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: "16px" }}>Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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

  // App loaded — render with DynamicAppLoader
  if (moduleUrl && appletComponent) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#0f172a",
          overflow: "hidden",
        }}
      >
        <DynamicAppLoader
          moduleUrl={moduleUrl}
          componentName={appletComponent}
          componentProps={{
            context: {
              appId,
              path,
              guest: {
                id: contextId,
                data: contextData,
                password: validatedPassword || "",
              },
            },
          }}
          onError={(errorMessage) => setError(errorMessage)}
        />
      </div>
    );
  }

  return null;
}
