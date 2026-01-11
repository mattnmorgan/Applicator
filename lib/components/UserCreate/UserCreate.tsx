"use client";

import { useState, useEffect } from "react";
import Badge from "../Badge/Badge";
import styles from "./UserCreate.module.css";

interface Authority {
  id: string;
  name: string;
  contextual?: boolean;
}

interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel: string;
  contextual?: boolean;
}

interface SubApp {
  id: string; // Full sub-app ID: "mainAppId:subAppId"
  label: string;
  description: string;
  mainAppLabel: string; // Main app label for display
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
  const [availableSubApps, setAvailableSubApps] = useState<SubApp[]>([]);
  const [authorizationSearch, setAuthorizationSearch] = useState("");
  const [appSearch, setAppSearch] = useState("");

  const isEditMode = !!editUser;

  useEffect(() => {
    fetchAuthorities();
    fetchAuthorizations();
    fetchApps();
  }, []);

  const fetchAuthorities = async () => {
    try {
      const response = await fetch("/api/system/apps/system/tables/authority");
      const data = await response.json();
      // Filter out contextual authorities and user-specific authorities
      const allAuthorities = data.records || [];
      const nonContextualAuthorities = allAuthorities
        .filter((record: any) => !record.data.contextual && !record.data.userId)
        .map((record: any) => ({
          id: record.id,
          name: record.data.name,
          contextual: record.data.contextual,
        }));
      setAuthorities(nonContextualAuthorities);
    } catch (error) {
      console.error("Failed to fetch authorities:", error);
    }
  };

  const fetchAuthorizations = async () => {
    try {
      const response = await fetch("/api/system/apps/system/tables/authorization");
      const data = await response.json();

      // Transform and filter out contextual authorizations
      const nonContextualAuthorizations = (data.records || [])
        .filter((record: any) => !record.data.contextual)
        .map((record: any) => ({
          id: record.id,
          name: record.data.name,
          description: record.data.description,
          app: record.data.app,
          contextual: record.data.contextual,
        }));

      setAvailableAuthorizations(nonContextualAuthorizations);
    } catch (error) {
      console.error("Failed to fetch authorizations:", error);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await fetch("/api/system/apps");
      const data = await response.json();

      // Transform main apps into sub-apps list
      const subAppsList: SubApp[] = [];
      for (const mainApp of data.apps || []) {
        if (mainApp.subApps) {
          for (const subApp of mainApp.subApps) {
            subAppsList.push({
              id: `${mainApp.id}:${subApp.id}`,
              label: subApp.label,
              description: subApp.description,
              mainAppLabel: mainApp.label,
            });
          }
        }
      }
      setAvailableSubApps(subAppsList);
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

  const filteredAuthorizations = availableAuthorizations
    .filter((auth) => !auth.contextual)
    .filter((auth) =>
      authorizationSearch
        ? auth.name.toLowerCase().includes(authorizationSearch.toLowerCase()) ||
          auth.description.toLowerCase().includes(authorizationSearch.toLowerCase()) ||
          auth.appLabel.toLowerCase().includes(authorizationSearch.toLowerCase())
        : true
    );

  const filteredSubApps = availableSubApps
    .filter((subApp) => !subApp.id.startsWith("system:"))
    .filter((subApp) =>
      appSearch
        ? subApp.label.toLowerCase().includes(appSearch.toLowerCase()) ||
          subApp.description.toLowerCase().includes(appSearch.toLowerCase()) ||
          subApp.mainAppLabel.toLowerCase().includes(appSearch.toLowerCase())
        : true
    );

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
          <input
            type="text"
            className={styles.input}
            placeholder="Search authorizations..."
            value={authorizationSearch}
            onChange={(e) => setAuthorizationSearch(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          <div className={styles.authorizationList}>
            {filteredAuthorizations.map((auth) => (
              <div key={auth.id} className={styles.authorizationItem}>
                <input
                  type="checkbox"
                  id={`auth-${auth.id}`}
                  className={styles.checkbox}
                  checked={customAuthorizations.includes(auth.id)}
                  onChange={() => handleAuthorizationToggle(auth.id)}
                />
                <label htmlFor={`auth-${auth.id}`} className={styles.authorizationLabel}>
                  <div className={styles.authorizationName}>
                    <Badge variant={auth.app === 'system' ? 'purple' : 'blue'}>
                      {auth.appLabel}
                    </Badge>
                    {auth.name}
                  </div>
                  <div className={styles.authorizationDescription}>{auth.description}</div>
                </label>
              </div>
            ))}
            {filteredAuthorizations.length === 0 && (
              <div className={styles.emptyState}>No authorizations found</div>
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            These authorizations will be granted in addition to those from the
            selected authority.
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Custom App Access</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Search apps..."
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          <div className={styles.authorizationList}>
            {filteredSubApps.map((subApp) => (
              <div key={subApp.id} className={styles.authorizationItem}>
                <input
                  type="checkbox"
                  id={`app-${subApp.id}`}
                  className={styles.checkbox}
                  checked={customApps.includes(subApp.id)}
                  onChange={() => handleAppToggle(subApp.id)}
                />
                <label htmlFor={`app-${subApp.id}`} className={styles.authorizationLabel}>
                  <div className={styles.authorizationName}>
                    <Badge variant="blue">
                      {subApp.mainAppLabel}
                    </Badge>
                    {subApp.label}
                  </div>
                  <div className={styles.authorizationDescription}>{subApp.description}</div>
                </label>
              </div>
            ))}
            {filteredSubApps.length === 0 && (
              <div className={styles.emptyState}>No apps found</div>
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
