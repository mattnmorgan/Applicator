'use client';

import { useState, useEffect } from 'react';
import styles from './AppView.module.css';

interface ApiRoute {
  path: string;
  method: string;
  handler: string;
  description: string;
}

interface App {
  id: string;
  label: string;
  version: string;
  author: string;
  contactEmail: string;
  description: string;
  apiRoutes: ApiRoute[];
}

interface AppViewProps {
  appId: string;
  onBack: () => void;
}

export default function AppView({ appId, onBack }: AppViewProps) {
  const [app, setApp] = useState<App | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApp();
  }, [appId]);

  async function loadApp() {
    try {
      setLoading(true);
      const response = await fetch(`/api/apps?id=${appId}`);
      if (response.ok) {
        const data = await response.json();
        const appData = data.apps?.find((a: App) => a.id === appId);
        if (appData) {
          setApp(appData);
          // Try to load icon
          const iconResponse = await fetch(`/api/assets/apps/icons/${appId}`);
          if (iconResponse.ok) {
            const blob = await iconResponse.blob();
            setIconUrl(URL.createObjectURL(blob));
          }
        }
      }
    } catch (error) {
      console.error('Error loading app:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>App not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Apps
        </button>
      </div>

      <div className={styles.appInfo}>
        {iconUrl && (
          <img src={iconUrl} alt={`${app.label} icon`} className={styles.icon} />
        )}
        <div className={styles.details}>
          <h1 className={styles.title}>{app.label}</h1>
          <p className={styles.version}>Version {app.version}</p>
          <p className={styles.author}>
            by {app.author}
            {app.contactEmail && (
              <span className={styles.email}> ({app.contactEmail})</span>
            )}
          </p>
          <p className={styles.description}>{app.description}</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>API Routes</h2>
        {app.apiRoutes && app.apiRoutes.length > 0 ? (
          <div className={styles.routeList}>
            {app.apiRoutes.map((route, index) => (
              <div key={index} className={styles.routeRow}>
                <div className={styles.routeMethod}>{route.method}</div>
                <div className={styles.routePath}>/api/app-api/{app.id}/{route.path}</div>
                <div className={styles.routeDescription}>{route.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noRoutes}>No API routes defined</p>
        )}
      </div>
    </div>
  );
}
