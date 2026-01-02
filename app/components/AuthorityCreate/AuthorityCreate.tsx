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
    isAdmin: boolean;
    icon?: string;
    authorizations?: string[];
  };
}

interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel: string;
}

export default function AuthorityCreate({ onCancel, onAuthorityCreated, editAuthority }: AuthorityCreateProps) {
  const [name, setName] = useState(editAuthority?.name || '');
  const [isAdmin, setIsAdmin] = useState(editAuthority?.isAdmin || false);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isEditMode = !!editAuthority;
  const isSystemAuthority = editAuthority && ['admin', 'user', 'guest'].includes(editAuthority.id);

  useEffect(() => {
    const fetchAuthorizations = async () => {
      try {
        const response = await fetch('/api/authorizations');
        const data = await response.json();
        setAuthorizations(data.authorizations || []);
      } catch (error) {
        console.error('Failed to fetch authorizations:', error);
      }
    };
    fetchAuthorizations();
  }, []);

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
        formData.append('isAdmin', isAdmin.toString());
      }
      if (iconFile) {
        formData.append('icon', iconFile);
      }
      if (clearIcon) {
        formData.append('clearIcon', 'true');
      }
      // Add authorizations
      formData.append('authorizations', JSON.stringify(Array.from(selectedAuthorizations)));

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
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="isAdmin"
              className={styles.checkbox}
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              disabled={isSystemAuthority}
            />
            <label htmlFor="isAdmin" className={styles.checkboxLabel}>
              Has administrator privileges
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

        {isSystemAuthority && (
          <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
            Note: System authorities (Administrator, User, Guest) cannot be modified except for their icon and authorizations.
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
