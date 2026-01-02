'use client';

import { useState, useEffect } from 'react';
import styles from './UserCreate.module.css';

interface Authority {
  id: string;
  name: string;
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
  };
}

export default function UserCreate({ onCancel, onUserCreated, editUser }: UserCreateProps) {
  const [displayName, setDisplayName] = useState(editUser?.displayName || '');
  const [username, setUsername] = useState(editUser?.username || '');
  const [email, setEmail] = useState(editUser?.email || '');
  const [password, setPassword] = useState('');
  const [authority, setAuthority] = useState(editUser?.authority || 'user');
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(editUser?.profilePicture || '');
  const [clearProfilePicture, setClearProfilePicture] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!editUser;

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const fetchAuthorities = async () => {
    try {
      const response = await fetch('/api/authorities');
      const data = await response.json();
      setAuthorities(data.authorities || []);
    } catch (error) {
      console.error('Failed to fetch authorities:', error);
    }
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
    setPreviewUrl('');
    if (isEditMode) {
      setClearProfilePicture(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName || !username || !email || (!password && !isEditMode)) {
      setError(isEditMode ? 'Display name, username, and email are required' : 'All fields except profile picture are required');
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('displayName', displayName);
      formData.append('username', username);
      formData.append('email', email);
      if (password) {
        formData.append('password', password);
      }
      formData.append('authority', authority);
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }
      if (clearProfilePicture) {
        formData.append('clearProfilePicture', 'true');
      }

      const url = isEditMode ? `/api/users/${editUser.id}` : '/api/users/create';
      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'create'} user`);
        return;
      }

      onUserCreated();
    } catch (err) {
      setError(`Failed to ${isEditMode ? 'update' : 'create'} user`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{isEditMode ? 'Edit User' : 'Create User'}</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

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
          <label className={styles.label}>Password {!isEditMode && '*'}</label>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEditMode ? 'Leave blank to keep current password' : '••••••••'}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Authority *</label>
          <select
            className={styles.input}
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
          >
            {authorities.map(auth => (
              <option key={auth.id} value={auth.id}>
                {auth.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Profile Picture</label>
          <div className={styles.fileInputContainer}>
            {previewUrl && (
              <div className={styles.preview} onClick={handleClearPicture}>
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
              id="profilePicture"
            />
            <label htmlFor="profilePicture" className={styles.fileLabel}>
              {profilePicture ? profilePicture.name : 'Choose file'}
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
            {creating ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update User' : 'Create User')}
          </button>
        </div>
      </form>
    </div>
  );
}
