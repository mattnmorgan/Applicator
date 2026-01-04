"use client";

import { useState, useEffect } from "react";
import styles from "./UserCreate.module.css";

interface Authority {
  id: string;
  name: string;
}

interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel: string;
}

interface App {
  id: string;
  label: string;
}

interface UserCreateProps {
  onCancel: () => void;
  onUserCreated: () => void;
  editUser?: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    authority: string;
    profilePicture?: string;
    authorizations: {
      authorizations: string[];
      userAuthorizations: string[];
    };
    apps: {
      accesses: string[];
      userAccesses: string[];
    };
  };
}

export default function UserCreate({
  onCancel,
  onUserCreated,
  editUser,
}: UserCreateProps) {
  const [displayName, setDisplayName] = useState(editUser?.displayName || "");
  const [username, setUsername] = useState(editUser?.username || "");
  const [email, setEmail] = useState(editUser?.email || "");
  const [password, setPassword] = useState("");
  const [authority, setAuthority] = useState(editUser?.authority || "user");
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    editUser?.profilePicture || ""
  );
  const [clearProfilePicture, setClearProfilePicture] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Custom authorizations and apps
  const [customAuthorizations, setCustomAuthorizations] = useState<string[]>(
    editUser?.authorizations.userAuthorizations || []
  );
  const [customApps, setCustomApps] = useState<string[]>(
    editUser?.apps.userAccesses || []
  );
  const [availableAuthorizations, setAvailableAuthorizations] = useState<
    Authorization[]
  >([]);
  const [availableApps, setAvailableApps] = useState<App[]>([]);

  const isEditMode = !!editUser;

  useEffect(() => {
    fetchAuthorities();
    fetchAuthorizations();
    fetchApps();
  }, []);

  const fetchAuthorities = async () => {
    try {
      const response = await fetch("/api/system/model/authorities");
      const data = await response.json();
      setAuthorities(data.authorities || []);
    } catch (error) {
      console.error("Failed to fetch authorities:", error);
    }
  };

  const fetchAuthorizations = async () => {
    try {
      const response = await fetch("/api/system/model/authorizations");
      const data = await response.json();
      setAvailableAuthorizations(data.authorizations || []);
    } catch (error) {
      console.error("Failed to fetch authorizations:", error);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await fetch("/api/system/apps");
      const data = await response.json();
      setAvailableApps(data.apps || []);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    }
  };

  const handleAuthorizationToggle = (authId: string) => {
    setCustomAuthorizations((prev) =>
      prev.includes(authId)
        ? prev.filter((id) => id !== authId)
        : [...prev, authId]
    );
  };

  const handleAppToggle = (appId: string) => {
    setCustomApps((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearPicture = () => {
    setProfilePicture(null);
    setPreviewUrl("");
    if (isEditMode) {
      setClearProfilePicture(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName || !username || !email || (!password && !isEditMode)) {
      setError(
        isEditMode
          ? "Display name, username, and email are required"
          : "All fields except profile picture are required"
      );
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("displayName", displayName);
      formData.append("username", username);
      formData.append("email", email);
      if (password) {
        formData.append("password", password);
      }
      formData.append("authority", authority);
      formData.append(
        "customAuthorizations",
        JSON.stringify(customAuthorizations)
      );
      formData.append("customApps", JSON.stringify(customApps));
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }
      if (clearProfilePicture) {
        formData.append("clearProfilePicture", "true");
      }

      const url = isEditMode
        ? `/api/system/model/users/${editUser.id}`
        : "/api/system/model/users/create";
      const response = await fetch(url, {
        method: isEditMode ? "PATCH" : "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || `Failed to ${isEditMode ? "update" : "create"} user`
        );
        return;
      }

      onUserCreated();
    } catch (err) {
      setError(`Failed to ${isEditMode ? "update" : "create"} user`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditMode ? "Edit User" : "Create User"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label className={styles.label}>Display Name *</label>
          <input
            type="text"
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Username *</label>
          <input
            type="text"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndoe"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email *</label>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password {!isEditMode && "*"}</label>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              isEditMode ? "Leave blank to keep current password" : "••••••••"
            }
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Authority *</label>
          <select
            className={styles.input}
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
          >
            {authorities.map((auth) => (
              <option key={auth.id} value={auth.id}>
                {auth.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Custom Authorizations</label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "200px",
              overflowY: "auto",
              padding: "8px",
              backgroundColor: "#1e293b",
              borderRadius: "4px",
              border: "1px solid #334155",
            }}
          >
            {availableAuthorizations.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                No authorizations available
              </div>
            ) : (
              availableAuthorizations.map((auth) => (
                <label
                  key={auth.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                    backgroundColor: customAuthorizations.includes(auth.id)
                      ? "#334155"
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={customAuthorizations.includes(auth.id)}
                    onChange={() => handleAuthorizationToggle(auth.id)}
                    style={{ marginTop: "2px", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: "#f1f5f9",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      {auth.name}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      {auth.description}
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "11px",
                        marginTop: "2px",
                      }}
                    >
                      App: {auth.appLabel}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            These authorizations will be granted in addition to those from the
            selected authority.
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Custom App Access</label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "200px",
              overflowY: "auto",
              padding: "8px",
              backgroundColor: "#1e293b",
              borderRadius: "4px",
              border: "1px solid #334155",
            }}
          >
            {availableApps.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                No apps available
              </div>
            ) : (
              availableApps.map((app) => (
                <label
                  key={app.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                    backgroundColor: customApps.includes(app.id)
                      ? "#334155"
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={customApps.includes(app.id)}
                    onChange={() => handleAppToggle(app.id)}
                    style={{ cursor: "pointer" }}
                  />
                  <div style={{ color: "#f1f5f9", fontSize: "14px" }}>
                    {app.label}
                  </div>
                </label>
              ))
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            These apps will be accessible in addition to those from the selected
            authority.
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Profile Picture</label>
          <div className={styles.fileInputContainer}>
            {previewUrl && (
              <div className={styles.preview} onClick={handleClearPicture}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className={styles.previewImage}
                />
                <div className={styles.previewOverlay}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6L18 18M6 18L18 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={styles.fileInput}
              id="profilePicture"
            />
            <label htmlFor="profilePicture" className={styles.fileLabel}>
              {profilePicture ? profilePicture.name : "Choose file"}
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelActionButton}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={creating}
          >
            {creating
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
              ? "Update User"
              : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
