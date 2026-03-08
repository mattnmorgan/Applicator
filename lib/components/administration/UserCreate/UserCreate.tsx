"use client";

import { useState, useEffect } from "react";
import Badge from "@/lib/components/utility/Badge/Badge";
import styles from "./UserCreate.module.css";
import UserManager from "@/lib/client/managers/user";
import AuthorityManager from "@/lib/client/managers/authority";
import AuthorizationManager from "@/lib/client/managers/authorization";
import AppManager from "@/lib/client/managers/app";
import AppletManager from "@/lib/client/managers/applet";
import TableRecord from "@/lib/database/crud/types/record";
import User from "@/lib/database/types/user";
import Authority from "@/lib/database/types/authority";
import { uploadFile, getSystemSettings } from "@/lib/client/database/crud/";
import Button from "@/lib/components/utility/Button";
import StickyFooter from "@/lib/components/utility/StickyFooter";

interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel: string;
  contextual?: boolean;
  target?: "user" | "app";
}

interface Applet {
  id: string; // Applet ID: "appId:appletId"
  label: string;
  description: string;
  appLabel: string; // App label for display
  target: string;
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
    icon?: string; // Path to user's profile picture
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
  const [authorities, setAuthorities] = useState<TableRecord<Authority>[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    editUser?.icon
      ? `/api/system/assets/icons/users/${editUser.id}?t=${Date.now()}`
      : "",
  );
  const [clearProfilePicture, setClearProfilePicture] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Custom authorizations and apps
  const [customAuthorizations, setCustomAuthorizations] = useState<string[]>(
    editUser?.authorizations?.userAuthorizations || [],
  );
  const [customApps, setCustomApps] = useState<string[]>(
    editUser?.apps?.userAccesses || [],
  );
  const [availableAuthorizations, setAvailableAuthorizations] = useState<
    Authorization[]
  >([]);
  const [availableApplets, setAvailableApplets] = useState<Applet[]>([]);
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
      setAuthorities(
        (
          await new AuthorityManager().readRecords({
            fields: { contextual: false },
          })
        ).records.filter((r) => !r.data.user_id),
      );
    } catch (error) {
      console.error("Failed to fetch authorities:", error);
    }
  };

  const fetchAuthorizations = async () => {
    try {
      const authorizationManager = new AuthorizationManager();
      const appManager = new AppManager();

      const [authData, appsData] = await Promise.all([
        authorizationManager.readRecords({}),
        appManager.readRecords({}),
      ]);

      // Create app ID to label mapping
      const appIdToLabel = new Map<string, string>();
      for (const app of appsData.records) {
        appIdToLabel.set(app.id, app.data.label);
      }

      // Transform and filter out contextual authorizations
      const nonContextualAuthorizations = authData.records
        .filter((record) => !record.data.contextual)
        .map((record) => ({
          id: record.id,
          name: record.data.name,
          description: record.data.description,
          app: record.data.app,
          appLabel: appIdToLabel.get(record.data.app) || record.data.app,
          contextual: record.data.contextual,
          target: record.data.target,
        }));

      setAvailableAuthorizations(nonContextualAuthorizations);
    } catch (error) {
      console.error("Failed to fetch authorizations:", error);
    }
  };

  const fetchApps = async () => {
    try {
      const appManager = new AppManager();
      const appletManager = new AppletManager();

      const [appsData, appletsData] = await Promise.all([
        appManager.readRecords({}),
        appletManager.readRecords({}),
      ]);

      // Create app ID to label mapping
      const appIdToLabel = new Map<string, string>();
      for (const app of appsData.records) {
        appIdToLabel.set(app.id, app.data.label);
      }

      // Transform applet records into expected format
      const appletsList: Applet[] = appletsData.records.map((record) => ({
        id: record.id,
        label: record.data.label,
        description: record.data.description,
        appLabel: appIdToLabel.get(record.data.app) || record.data.app,
        target: record.data.target,
      }));
      setAvailableApplets(appletsList);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    }
  };

  const handleAuthorizationToggle = (authId: string) => {
    setCustomAuthorizations((prev) =>
      prev.includes(authId)
        ? prev.filter((id) => id !== authId)
        : [...prev, authId],
    );
  };

  const handleAppToggle = (appId: string) => {
    setCustomApps((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId],
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
          : "All fields except profile picture are required",
      );
      return;
    }

    setCreating(true);
    try {
      const manager = new UserManager();
      const authorityManager = new AuthorityManager();
      let record: Partial<TableRecord<User>> = {
        id: editUser?.id,
        data: {
          username: username,
          display_name: displayName,
          email: email,
          authority_id: authority,
          is_active: true,
          password_hash: password == "" ? undefined : password,
        },
      };

      // Handle icon in the initial update
      if (clearProfilePicture) {
        // User explicitly wants to clear the picture
        record.data.icon = null;
      } else if (editUser?.icon) {
        // Preserve existing icon (will be overwritten later if new file is uploaded)
        record.data.icon = editUser.icon;
      }
      // Note: If new icon file is selected, it will be uploaded and updated after this

      console.log(JSON.stringify(record));
      if (isEditMode) {
        record = await manager.updateRecord(record.id, record.data);
      } else {
        record = await manager.createRecord(record.data);
      }
      console.log(JSON.stringify(record));

      if (profilePicture && !clearProfilePicture) {
        try {
          const systemSettings = await getSystemSettings();

          if (!systemSettings.storage) {
            throw new Error("System storage not configured");
          }

          const fname = `${record.id}.png`;
          await uploadFile(
            profilePicture,
            `${systemSettings.storage}/apps/system/icons/users`,
            fname,
          );
          record = await manager.updateRecord(record.id, {
            ...record?.data,
            icon: "true",
          });
        } catch (iconError) {
          console.error("Failed to upload profile picture:", iconError);
          setError(
            `User ${isEditMode ? "updated" : "created"} but profile picture upload failed`,
          );
        }
      }

      // Create or update user-specific authority for custom authorizations/apps
      try {
        const userAuthorityId = `user-specific:${record.id}`;
        let userAuthority = await authorityManager.readRecord({
          id: userAuthorityId,
        });

        if (!userAuthority) {
          userAuthority = await authorityManager.createRecord(
            {
              authorizations: customAuthorizations,
              apps: customApps,
              name: `${record.data.display_name} (User-specific)`,
              user_id: record.id,
            },
            userAuthorityId,
          );
        } else {
          await authorityManager.updateRecord(`user-specific:${record.id}`, {
            authorizations: customAuthorizations,
            apps: customApps,
            user_id: record.id,
          });
        }
      } catch (authError) {
        console.error("Failed to set user-specific authority:", authError);
        setError(
          `User ${isEditMode ? "updated" : "created"} but custom authorizations could not be saved`,
        );
      }

      onUserCreated();
    } catch (err) {
      console.error("Failed to create/update user:", err);
      setError(`Failed to ${isEditMode ? "update" : "create"} user`);
    } finally {
      setCreating(false);
    }
  };

  const filteredAuthorizations = availableAuthorizations
    .filter((auth) => !auth.contextual && auth.target !== "app")
    .filter((auth) =>
      authorizationSearch
        ? auth.name.toLowerCase().includes(authorizationSearch.toLowerCase()) ||
          auth.description
            .toLowerCase()
            .includes(authorizationSearch.toLowerCase()) ||
          auth.appLabel
            .toLowerCase()
            .includes(authorizationSearch.toLowerCase())
        : true,
    );

  const filteredApplets = availableApplets
    .filter(
      (applet) =>
        !applet.id.startsWith("system:") && !["guest"].includes(applet.target),
    )
    .filter((applet) =>
      appSearch
        ? applet.label.toLowerCase().includes(appSearch.toLowerCase()) ||
          applet.description.toLowerCase().includes(appSearch.toLowerCase()) ||
          applet.appLabel.toLowerCase().includes(appSearch.toLowerCase())
        : true,
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
                {auth.data.name}
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
            style={{ marginBottom: "12px" }}
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
                <label
                  htmlFor={`auth-${auth.id}`}
                  className={styles.authorizationLabel}
                >
                  <div className={styles.authorizationName}>
                    <Badge variant={auth.app === "system" ? "purple" : "blue"}>
                      {auth.appLabel}
                    </Badge>
                    {auth.name}
                  </div>
                  <div className={styles.authorizationDescription}>
                    {auth.description}
                  </div>
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
            style={{ marginBottom: "12px" }}
          />
          <div className={styles.authorizationList}>
            {filteredApplets.map((applet) => (
              <div key={applet.id} className={styles.authorizationItem}>
                <input
                  type="checkbox"
                  id={`app-${applet.id}`}
                  className={styles.checkbox}
                  checked={customApps.includes(applet.id)}
                  onChange={() => handleAppToggle(applet.id)}
                />
                <label
                  htmlFor={`app-${applet.id}`}
                  className={styles.authorizationLabel}
                >
                  <div className={styles.authorizationName}>
                    <Badge variant="blue">{applet.appLabel}</Badge>
                    {applet.label}
                  </div>
                  <div className={styles.authorizationDescription}>
                    {applet.description}
                  </div>
                </label>
              </div>
            ))}
            {filteredApplets.length === 0 && (
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

        <StickyFooter bleed={20}>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={creating}>
            {creating
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update User"
                : "Create User"}
          </Button>
        </StickyFooter>
      </form>
    </div>
  );
}
