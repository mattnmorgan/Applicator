'use client';

import { useState, useEffect, useRef } from 'react';
import Row from '../Row';
import AppView from '../AppView/AppView';
import styles from './AppList.module.css';

interface App {
  id: string;
  label: string;
  version: string;
  author: string;
  contactEmail: string;
  description: string;
}

export default function AppList() {
  const [apps, setApps] = useState<App[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      setApps(data.apps || []);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleInstallClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setInstalling(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/apps/install', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(`App "${data.name}" installed successfully!`);
        await fetchApps();
      } else {
        alert(`Failed to install app: ${data.error}`);
      }
    } catch (error) {
      console.error('Error installing app:', error);
      alert('Failed to install app');
    } finally {
      setInstalling(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUninstall = async (appId: string, appName: string) => {
    if (!confirm(`Are you sure you want to uninstall "${appName}"? This will delete all app data, authorizations, and remove it from all authorities.`)) {
      return;
    }

    setUninstalling(appId);
    try {
      const response = await fetch('/api/apps/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('App uninstalled successfully!');
        await fetchApps();
      } else {
        alert(`Failed to uninstall app: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uninstalling app:', error);
      alert('Failed to uninstall app');
    } finally {
      setUninstalling(null);
    }
  };

  const filteredApps = apps.filter(app =>
    app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If an app is selected, show the AppView
  if (selectedAppId) {
    return <AppView appId={selectedAppId} onBack={() => setSelectedAppId(null)} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className={styles.installButton}
        >
          {installing ? 'Installing...' : '+ Install App'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".js"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.appList}>
        {filteredApps.map(app => (
          <Row key={app.id}>
            <div className={styles.appInfo} onClick={() => setSelectedAppId(app.id)} style={{ cursor: 'pointer' }}>
              <div className={styles.iconPlaceholder}>
                {app.label.charAt(0).toUpperCase()}
              </div>
              <div className={styles.contentColumn}>
                <div className={styles.headerRow}>
                  <div className={styles.appLabel}>{app.label}</div>
                  <span className={styles.versionBadge}>v{app.version}</span>
                </div>
                <div className={styles.appDescription}>{app.description}</div>
                <div className={styles.appAuthor}>By {app.author}</div>
              </div>
              {app.id !== 'system' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUninstall(app.id, app.label);
                  }}
                  disabled={uninstalling === app.id}
                  className={styles.uninstallButton}
                >
                  {uninstalling === app.id ? 'Uninstalling...' : 'Uninstall'}
                </button>
              )}
            </div>
          </Row>
        ))}

        {filteredApps.length === 0 && (
          <div className={styles.emptyState}>
            No apps found
          </div>
        )}
      </div>
    </div>
  );
}
