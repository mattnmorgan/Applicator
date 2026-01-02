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
}

export default function UserCreate({ onCancel, onUserCreated }: UserCreateProps) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authority, setAuthority] = useState('user');
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName || !username || !email || !password) {
      setError('All fields except profile picture are required');
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('displayName', displayName);
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('authority', authority);
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      const response = await fetch('/api/users/create', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }

      onUserCreated();
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Create User</h2>
        <button className={styles.cancelButton} onClick={onCancel}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5L15 15M5 15L15 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
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
          <label className={styles.label}>Password *</label>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
              <div className={styles.preview}>
                <img src={previewUrl} alt="Preview" className={styles.previewImage} />
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
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}
