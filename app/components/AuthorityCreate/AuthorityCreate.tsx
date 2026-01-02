'use client';

import { useState, useEffect } from 'react';
import Toast from '../Toast';
import styles from './AuthorityCreate.module.css';

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
}

interface App {
  id: string;
  label: string;
  description: string;
}

export default function AuthorityCreate({ onCancel, onAuthorityCreated, editAuthority }: AuthorityCreateProps) {
  const [name, setName] = useState(editAuthority?.name || '');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(editAuthority?.icon || '');
  const [clearIcon, setClearIcon] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [selectedAuthorizations, setSelectedAuthorizations] = useState<Set<string>>(
    new Set(editAuthority?.authorizations || [])
  );
  const [authorizationSearch, setAuthorizationSearch] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(
    new Set(editAuthority?.apps || [])
  );
  const [appSearch, setAppSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isEditMode = !!editAuthority;
  const isSystemAuthority = editAuthority && ['admin', 'user', 'guest'].includes(editAuthority.id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [authResponse, appsResponse] = await Promise.all([
          fetch('/api/authorizations'),
          fetch('/api/apps'),
        ]);
        const authData = await authResponse.json();
        const appsData = await appsResponse.json();
        setAuthorizations(authData.authorizations || []);
        setApps(appsData.apps || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  // Update selected apps and authorizations when editAuthority changes
  useEffect(() => {
    if (editAuthority) {
      setSelectedAuthorizations(new Set(editAuthority.authorizations || []));
      setSelectedApps(new Set(editAuthority.apps || []));
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
    setPreviewUrl('');
    setClearIcon(true);
  };

  const handleToggleAuthorization = (authorizationId: string) => {
    // Validation for admin authority: cannot deselect 'admin' authorization
    if (editAuthority?.id === 'admin' && authorizationId === 'admin' && selectedAuthorizations.has(authorizationId)) {
      setToast({ message: 'Cannot remove Administrator authorization from admin authority', type: 'error' });
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

  const handleToggleApp = (appId: string) => {
    const newSelection = new Set(selectedApps);
    if (newSelection.has(appId)) {
      newSelection.delete(appId);
    } else {
      newSelection.add(appId);
    }
    setSelectedApps(newSelection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() && !isSystemAuthority) {
      setError('Authority name is required');
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      if (!isSystemAuthority) {
        formData.append('name', name.trim());
      }
      if (iconFile) {
        formData.append('icon', iconFile);
      }
      if (clearIcon) {
        formData.append('clearIcon', 'true');
      }
      // Add authorizations
      formData.append('authorizations', JSON.stringify(Array.from(selectedAuthorizations)));
      // Add apps
      formData.append('apps', JSON.stringify(Array.from(selectedApps)));

      const url = isEditMode ? `/api/authorities/${editAuthority.id}` : '/api/authorities/create';
      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'create'} authority`);
        return;
      }

      onAuthorityCreated();
    } catch (err) {
      setError(`Failed to ${isEditMode ? 'update' : 'create'} authority`);
    } finally {
      setCreating(false);
    }
  };

  const filteredAuthorizations = authorizations.filter(auth =>
    auth.name.toLowerCase().includes(authorizationSearch.toLowerCase()) ||
    auth.description.toLowerCase().includes(authorizationSearch.toLowerCase())
  );

  const filteredApps = apps
    .filter(app => app.id !== 'system') // Exclude system app
    .filter(app =>
      app.label.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.description.toLowerCase().includes(appSearch.toLowerCase())
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
        <h2 className={styles.title}>{isEditMode ? 'Edit Authority' : 'Create Authority'}</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

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
                <img src={previewUrl} alt="Preview" className={styles.previewImage} />
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
              {iconFile ? iconFile.name : 'Choose file'}
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
            style={{ marginBottom: '12px' }}
          />
          <div className={styles.authorizationList}>
            {filteredAuthorizations.map(authorization => (
              <div key={authorization.id} className={styles.authorizationItem}>
                <input
                  type="checkbox"
                  id={`auth-${authorization.id}`}
                  className={styles.checkbox}
                  checked={selectedAuthorizations.has(authorization.id)}
                  onChange={() => handleToggleAuthorization(authorization.id)}
                />
                <label htmlFor={`auth-${authorization.id}`} className={styles.authorizationLabel}>
                  <div className={styles.authorizationName}>{authorization.name}</div>
                  <div className={styles.authorizationDescription}>{authorization.description}</div>
                  <div className={styles.authorizationApp}>
                    <span className={`${styles.badge} ${authorization.app === 'system' ? styles.badgeSystem : styles.badgeApp}`}>
                      {authorization.appLabel}
                    </span>
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
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          <div className={styles.authorizationList}>
            {filteredApps.map(app => (
              <div key={app.id} className={styles.authorizationItem}>
                <input
                  type="checkbox"
                  id={`app-${app.id}`}
                  className={styles.checkbox}
                  checked={selectedApps.has(app.id)}
                  onChange={() => handleToggleApp(app.id)}
                />
                <label htmlFor={`app-${app.id}`} className={styles.authorizationLabel}>
                  <div className={styles.authorizationName}>{app.label}</div>
                  <div className={styles.authorizationDescription}>{app.description}</div>
                </label>
              </div>
            ))}
            {filteredApps.length === 0 && (
              <div className={styles.emptyState}>No apps found</div>
            )}
          </div>
        </div>

        {isSystemAuthority && (
          <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
            Note: System authorities (Administrator, User, Guest) cannot be modified except for their icon, authorizations, and apps.
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
            {creating ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Authority' : 'Create Authority')}
          </button>
        </div>
      </form>
    </div>
  );
}
