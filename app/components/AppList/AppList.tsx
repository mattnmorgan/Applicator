'use client';

import { useState, useEffect } from 'react';
import Row from '../Row';
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

  const filteredApps = apps.filter(app =>
    app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      </div>

      <div className={styles.appList}>
        {filteredApps.map(app => (
          <Row key={app.id}>
            <div className={styles.appInfo}>
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
