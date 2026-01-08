'use client';

import { useState, useEffect } from 'react';
import Row from '../Row';
import styles from './AuthorizationList.module.css';

interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel: string;
  contextual?: boolean;
}

export default function AuthorizationList() {
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuthorizations = async () => {
    try {
      const response = await fetch('/api/system/model/authorizations');
      const data = await response.json();
      setAuthorizations(data.authorizations || []);
    } catch (error) {
      console.error('Failed to fetch authorizations:', error);
    }
  };

  useEffect(() => {
    fetchAuthorizations();
  }, []);

  const filteredAuthorizations = authorizations.filter(authorization =>
    authorization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    authorization.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search authorizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.authorizationList}>
        {filteredAuthorizations.map(authorization => (
          <Row key={authorization.id}>
            <div className={styles.authorizationInfo}>
              <div className={styles.iconPlaceholder}>
                {authorization.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.contentColumn}>
                <div className={styles.authorizationName}>{authorization.name}</div>
                <div className={styles.authorizationDescription}>{authorization.description}</div>
              </div>
            </div>
            <div className={styles.appColumn}>
              {authorization.contextual && (
                <span className={styles.badgeContextual}>
                  Contextual
                </span>
              )}
              <span className={`${styles.badge} ${authorization.app === 'system' ? styles.badgeSystem : styles.badgeApp}`}>
                {authorization.appLabel}
              </span>
            </div>
          </Row>
        ))}

        {filteredAuthorizations.length === 0 && (
          <div className={styles.emptyState}>
            No authorizations found
          </div>
        )}
      </div>
    </div>
  );
}
