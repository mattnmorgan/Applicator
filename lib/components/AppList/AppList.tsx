'use client';

import { useState, useEffect, useRef } from 'react';
import Row from '../Row';
import AppView from '../AppView/AppView';
import Toast from '../Toast';
import styles from './AppList.module.css';

interface Widget {
  id: string;
  name: string;
  description: string;
  target: 'home' | 'user-settings' | 'system-settings';
  component: string;
  appId: string;
}

interface App {
  id: string;
  label: string;
  version: string;
  author: string;
  contactEmail: string;
  description: string;
  widgets?: Widget[];
}

export default function AppList() {
  const [apps, setApps] = useState<App[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/system/apps');
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

      const response = await fetch('/api/system/apps/install', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: `App "${data.name}" installed successfully!`, type: 'success' });
        await fetchApps();
      } else {
        setToast({ message: data.error || 'Failed to install app', type: 'error' });
      }
    } catch (error) {
      console.error('Error installing app:', error);
      setToast({ message: 'Failed to install app', type: 'error' });
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
      const response = await fetch('/api/system/apps/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: 'App uninstalled successfully!', type: 'success' });
        await fetchApps();
      } else {
        setToast({ message: data.error || 'Failed to uninstall app', type: 'error' });
      }
    } catch (error) {
      console.error('Error uninstalling app:', error);
      setToast({ message: 'Failed to uninstall app', type: 'error' });
    } finally {
      setUninstalling(null);
    }
  };

  const filteredApps = apps.filter(app =>
    app.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If an app is selected, show the AppView
  if (selectedAppId) {
    return <AppView appId={selectedAppId} onBack={() => setSelectedAppId(null)} />;
  }

  return (
    <div className={styles.container}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
          accept=".zip"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.appList}>
        {filteredApps.map(app => (
          <Row key={app.id}>
            <div className={styles.appInfo} onClick={() => setSelectedAppId(app.id)} style={{ cursor: 'pointer' }}>
              <div className={styles.iconPlaceholder}>
                <span style={{ position: 'absolute' }}>
                  {(app.label || 'U').charAt(0).toUpperCase()}
                </span>
                <img
                  src={`/api/system/assets/apps/icons/${app.id}`}
                  alt={app.label}
                  onError={(e) => {
                    // If image fails to load, hide it to show the fallback letter
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    // If image loads successfully, hide the fallback letter
                    const target = e.target as HTMLImageElement;
                    const sibling = target.previousElementSibling as HTMLElement;
                    if (sibling) {
                      sibling.style.display = 'none';
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                />
              </div>
              <div className={styles.contentColumn}>
                <div className={styles.headerRow}>
                  <div className={styles.appLabel}>{app.label || 'Unknown App'}</div>
                  <span className={styles.versionBadge}>v{app.version || '0.0.0'}</span>
                </div>
                <div className={styles.appDescription}>{app.description || 'No description'}</div>
              </div>
              {app.id !== 'system' && (
                <div className={styles.buttonGroup}>
                  {app.widgets && app.widgets.some(w => w.target === 'system-settings') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const systemWidget = app.widgets!.find(w => w.target === 'system-settings');
                        if (systemWidget) {
                          window.location.href = `/settings/widgets/${systemWidget.id}`;
                        }
                      }}
                      className={styles.settingsButton}
                    >
                      Settings
                    </button>
                  )}
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
                </div>
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
