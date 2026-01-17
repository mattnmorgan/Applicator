"use client";

import { useState, useEffect } from "react";
import Toast from "../Toast";
import Badge from "../Badge/Badge";
import styles from "./AuthorityCreate.module.css";

interface AuthorityCreateProps {
  onCancel: () => void;
  onAuthorityCreated: () => void;
  editAuthority?: {
    id: string;
    name: string;
    icon?: string;
    authorizations?: string[];
    apps?: string[];
  };
}

interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel: string;
  contextual?: boolean;
}

interface Applet {
  id: string; // Applet ID: "appId:appletId"
  label: string;
  description: string;
  appLabel: string; // App label for display
  target: string;
}

export default function AuthorityCreate({
  onCancel,
  onAuthorityCreated,
  editAuthority,
}: AuthorityCreateProps) {
  const [name, setName] = useState(editAuthority?.name || "");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    editAuthority?.icon || ""
  );
  const [clearIcon, setClearIcon] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [selectedAuthorizations, setSelectedAuthorizations] = useState<
    Set<string>
  >(new Set(editAuthority?.authorizations || []));
  const [authorizationSearch, setAuthorizationSearch] = useState("");
  const [applets, setApplets] = useState<Applet[]>([]);
  const [selectedApplets, setSelectedApplets] = useState<Set<string>>(
    new Set(editAuthority?.apps || [])
  );
  const [appletSearch, setAppletSearch] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const isEditMode = !!editAuthority;
  const isSystemAuthority =
    editAuthority &&
    ["system:admin", "system:user", "system:guest"].includes(editAuthority.id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [authResponse, appsResponse, appletsResponse] = await Promise.all(
          [
            fetch("/api/system/apps/system/tables/authorization"),
            fetch("/api/system/apps"),
            fetch("/api/system/apps/system/tables/applet"),
          ]
        );
        const authData = await authResponse.json();
        const appsData = await appsResponse.json();
        const appletsData = await appletsResponse.json();

        // Create app ID to label mapping
        const appIdToLabel = new Map<string, string>();
        for (const app of appsData.apps || []) {
          appIdToLabel.set(app.id, app.label);
        }

        // Transform authorization records to expected format
        const authorizationsList = (authData.records || []).map(
          (record: any) => ({
            id: record.id,
            name: record.data.name,
            description: record.data.description,
            app: record.data.app,
            appLabel: appIdToLabel.get(record.data.app) || record.data.app,
            contextual: record.data.contextual,
          })
        );
        setAuthorizations(authorizationsList);

        // Transform applet records into expected format
        const appletsList: Applet[] = (appletsData.records || []).map(
          (record: any) => ({
            id: record.id,
            label: record.data.label,
            description: record.data.description,
            appLabel: appIdToLabel.get(record.data.app) || record.data.app,
            target: record.data.target,
          })
        );
        setApplets(appletsList);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Update selected applets and authorizations when editAuthority changes
  useEffect(() => {
    if (editAuthority) {
      setSelectedAuthorizations(new Set(editAuthority.authorizations || []));
      setSelectedApplets(new Set(editAuthority.apps || []));
    }
  }, [editAuthority]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setClearIcon(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearIcon = () => {
    setIconFile(null);
    setPreviewUrl("");
    setClearIcon(true);
  };

  const handleToggleAuthorization = (authorizationId: string) => {
    // Validation for admin authority: cannot deselect 'system:admin' authorization
    if (
      editAuthority?.id === "system:admin" &&
      authorizationId === "system:admin" &&
      selectedAuthorizations.has(authorizationId)
    ) {
      setToast({
        message:
          "Cannot remove Administrator authorization from admin authority",
        type: "error",
      });
      return;
    }

    const newSelection = new Set(selectedAuthorizations);
    if (newSelection.has(authorizationId)) {
      newSelection.delete(authorizationId);
    } else {
      newSelection.add(authorizationId);
    }
    setSelectedAuthorizations(newSelection);
  };

  const handleToggleApplet = (appletId: string) => {
    const newSelection = new Set(selectedApplets);
    if (newSelection.has(appletId)) {
      newSelection.delete(appletId);
    } else {
      newSelection.add(appletId);
    }
    setSelectedApplets(newSelection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() && !isSystemAuthority) {
      setError("Authority name is required");
      return;
    }

    setCreating(true);
    try {
      if (isEditMode) {
        // Update authority using generic table route
        const updateData: any = {};

        if (!isSystemAuthority) {
          updateData.name = name.trim();
        }

        // Add authorizations
        updateData.authorizations = Array.from(selectedAuthorizations);

        // Add applets
        updateData.apps = Array.from(selectedApplets);

        const response = await fetch(
          "/api/system/apps/system/tables/authority",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editAuthority.id,
              data: updateData,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to update authority");
          return;
        }

        // Handle icon upload/removal separately if needed
        if (iconFile) {
          // Get system storage path and construct the icon path
          const storageResponse = await fetch("/api/system/settings");
          const storageData = await storageResponse.json();
          const systemStorage = storageData.settings.storage;

          if (!systemStorage) {
            setError("System storage not configured");
            return;
          }

          const iconDirectory = `${systemStorage}/apps/system/icons/authorities`;
          const fileName = `${editAuthority.id}.png`;

          const iconFormData = new FormData();
          iconFormData.append("file", iconFile);
          iconFormData.append("path", iconDirectory);
          iconFormData.append("name", fileName);

          const iconResponse = await fetch("/api/system/apps/fs", {
            method: "PUT",
            body: iconFormData,
          });

          if (!iconResponse.ok) {
            setError("Failed to upload icon");
            return;
          }

          // Update the authority record with icon flag
          const updateIconResponse = await fetch(
            "/api/system/apps/system/tables/authority",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: editAuthority.id,
                data: { icon: "true" },
              }),
            }
          );

          if (!updateIconResponse.ok) {
            setError("Failed to update authority with icon path");
            return;
          }
        } else if (clearIcon) {
          // Get the current icon path and delete the file
          const storageResponse = await fetch("/api/system/settings");
          const storageData = await storageResponse.json();
          const systemStorage = storageData.settings.storage;
          const iconPath = `${systemStorage}/apps/system/icons/authorities/${editAuthority.id}.png`;

          const deleteResponse = await fetch("/api/system/apps/fs", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: iconPath }),
          });

          if (!deleteResponse.ok) {
            console.warn("Failed to delete icon file");
          }

          // Clear the icon field in the database
          const updateIconResponse = await fetch(
            "/api/system/apps/system/tables/authority",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: editAuthority.id,
                data: { icon: "" },
              }),
            }
          );

          if (!updateIconResponse.ok) {
            setError("Failed to remove icon");
            return;
          }
        }

        onAuthorityCreated();
      } else {
        // Create authority using generic table route
        const createData: any = {
          name: name.trim(),
          authorizations: Array.from(selectedAuthorizations),
          apps: Array.from(selectedApplets),
        };

        const response = await fetch(
          "/api/system/apps/system/tables/authority",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: createData }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to create authority");
          return;
        }

        const authorityId = data.record.id;

        // Handle icon upload separately if provided
        if (iconFile) {
          // Get system storage path and construct the icon path
          const storageResponse = await fetch("/api/system/settings");
          const storageData = await storageResponse.json();
          const systemStorage = storageData.settings.storage;

          if (!systemStorage) {
            setError("System storage not configured");
            return;
          }

          const fileExtension = iconFile.name.split(".").pop() || "jpg";
          const fileName = `icon.${fileExtension}`;
          const iconDirectory = `${systemStorage}\\system\\authorities\\icons\\${authorityId}`;

          const iconFormData = new FormData();
          iconFormData.append("file", iconFile);
          iconFormData.append("path", iconDirectory);
          iconFormData.append("name", fileName);

          const iconResponse = await fetch("/api/system/apps/fs", {
            method: "PUT",
            body: iconFormData,
          });

          if (!iconResponse.ok) {
            setError("Failed to upload icon");
            return;
          }

          // Update the authority record with the icon path
          const relativePath = `system\\authorities\\icons\\${authorityId}\\${fileName}`;
          const updateIconResponse = await fetch(
            "/api/system/apps/system/tables/authority",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: authorityId,
                data: { icon: relativePath },
              }),
            }
          );

          if (!updateIconResponse.ok) {
            setError("Failed to update authority with icon path");
            return;
          }
        }

        onAuthorityCreated();
      }
    } catch (err) {
      setError(`Failed to ${isEditMode ? "update" : "create"} authority`);
    } finally {
      setCreating(false);
    }
  };

  const filteredAuthorizations = authorizations
    .filter((auth) => !auth.contextual) // Exclude contextual authorizations
    .filter(
      (auth) =>
        auth.name.toLowerCase().includes(authorizationSearch.toLowerCase()) ||
        auth.description
          .toLowerCase()
          .includes(authorizationSearch.toLowerCase())
    );

  const filteredApplets = applets
    .filter((applet) => !applet.id.startsWith("system:")) // Exclude system applets
    .filter(
      (applet) =>
        applet.label.toLowerCase().includes(appletSearch.toLowerCase()) ||
        applet.description.toLowerCase().includes(appletSearch.toLowerCase()) ||
        applet.appLabel.toLowerCase().includes(appletSearch.toLowerCase())
    );

  return (
    <div className={styles.container}>
      {toast && (
        <div className={styles.toastContainer}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditMode ? "Edit Authority" : "Create Authority"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label className={styles.label}>Name *</label>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Authority Name"
            disabled={isSystemAuthority}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Icon</label>
          <div className={styles.fileInputContainer}>
            {previewUrl && (
              <div className={styles.preview} onClick={handleClearIcon}>
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
              id="iconFile"
            />
            <label htmlFor="iconFile" className={styles.fileLabel}>
              {iconFile ? iconFile.name : "Choose file"}
            </label>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Authorizations</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Search authorizations..."
            value={authorizationSearch}
            onChange={(e) => setAuthorizationSearch(e.target.value)}
            style={{ marginBottom: "12px" }}
          />
          <div className={styles.authorizationList}>
            {filteredAuthorizations.map((authorization) => (
              <div key={authorization.id} className={styles.authorizationItem}>
                <input
                  type="checkbox"
                  id={`auth-${authorization.id}`}
                  className={styles.checkbox}
                  checked={selectedAuthorizations.has(authorization.id)}
                  onChange={() => handleToggleAuthorization(authorization.id)}
                />
                <label
                  htmlFor={`auth-${authorization.id}`}
                  className={styles.authorizationLabel}
                >
                  <div className={styles.authorizationName}>
                    <Badge
                      variant={
                        authorization.app === "system" ? "purple" : "blue"
                      }
                    >
                      {authorization.appLabel}
                    </Badge>
                    {authorization.name}
                  </div>
                  <div className={styles.authorizationDescription}>
                    {authorization.description}
                  </div>
                </label>
              </div>
            ))}
            {filteredAuthorizations.length === 0 && (
              <div className={styles.emptyState}>No authorizations found</div>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Apps</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Search apps..."
            value={appletSearch}
            onChange={(e) => setAppletSearch(e.target.value)}
            style={{ marginBottom: "12px" }}
          />
          <div className={styles.authorizationList}>
            {filteredApplets.map((applet) => (
              <div key={applet.id} className={styles.authorizationItem}>
                <input
                  type="checkbox"
                  id={`applet-${applet.id}`}
                  className={styles.checkbox}
                  checked={selectedApplets.has(applet.id)}
                  onChange={() => handleToggleApplet(applet.id)}
                />
                <label
                  htmlFor={`applet-${applet.id}`}
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
        </div>

        {isSystemAuthority && (
          <div
            style={{ color: "#94a3b8", fontSize: "14px", fontStyle: "italic" }}
          >
            Note: System authorities (Administrator, User, Guest) cannot be
            modified except for their icon, authorizations, and apps.
          </div>
        )}

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
              ? "Update Authority"
              : "Create Authority"}
          </button>
        </div>
      </form>
    </div>
  );
}
