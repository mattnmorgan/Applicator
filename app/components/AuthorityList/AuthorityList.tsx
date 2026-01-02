'use client';

import { useState, useEffect } from 'react';
import ButtonMenu from '../ButtonMenu';
import Row from '../Row';
import Toast from '../Toast';
import AuthorityCreate from '../AuthorityCreate';
import styles from './AuthorityList.module.css';

interface Authority {
  id: string;
  name: string;
  isAdmin: boolean;
  icon?: string;
}

export default function AuthorityList() {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [selectedAuthorityIds, setSelectedAuthorityIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateAuthority, setShowCreateAuthority] = useState(false);
  const [editingAuthority, setEditingAuthority] = useState<Authority | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchAuthorities = async () => {
    try {
      const response = await fetch('/api/authorities');
      const data = await response.json();
      setAuthorities(data.authorities || []);
    } catch (error) {
      console.error('Failed to fetch authorities:', error);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const handleSelectAuthority = (authorityId: string, checked: boolean) => {
    const newSelection = new Set(selectedAuthorityIds);
    if (checked) {
      newSelection.add(authorityId);
    } else {
      newSelection.delete(authorityId);
    }
    setSelectedAuthorityIds(newSelection);
  };

  const handleDelete = async () => {
    if (selectedAuthorityIds.size === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/authorities/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorityIds: Array.from(selectedAuthorityIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.systemAuthorities) {
          setToast({ message: 'Cannot delete system authorities (Administrator, User, or Guest)', type: 'error' });
        } else if (data.violatedAuthorities) {
          const violatedNames = data.violatedAuthorities.map((id: string) => {
            const auth = authorities.find(a => a.id === id);
            return auth?.name || id;
          }).join(', ');
          setToast({ message: `Cannot delete authorities with assigned users: ${violatedNames}`, type: 'error' });
        } else {
          setToast({ message: data.error || 'Failed to delete authorities', type: 'error' });
        }
        return;
      }

      setToast({ message: data.message, type: 'success' });
      await fetchAuthorities();
      setSelectedAuthorityIds(new Set());
    } catch (error) {
      setToast({ message: 'Failed to delete authorities', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredAuthorities = authorities.filter(authority =>
    authority.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const someSelected = selectedAuthorityIds.size > 0;

  const handleAuthorityCreated = async () => {
    await fetchAuthorities();
    setShowCreateAuthority(false);
    setEditingAuthority(null);
  };

  const handleEditAuthority = async (authorityId: string) => {
    const response = await fetch(`/api/authorities/${authorityId}`);
    const data = await response.json();
    if (data.authority) {
      setEditingAuthority(data.authority);
    }
  };

  if (showCreateAuthority || editingAuthority) {
    return (
      <AuthorityCreate
        onCancel={() => {
          setShowCreateAuthority(false);
          setEditingAuthority(null);
        }}
        onAuthorityCreated={handleAuthorityCreated}
        editAuthority={editingAuthority ? {
          id: editingAuthority.id,
          name: editingAuthority.name,
          isAdmin: editingAuthority.isAdmin,
          icon: editingAuthority.icon,
        } : undefined}
      />
    );
  }

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

      <div className={styles.toolbar}>
        <button className={styles.addButton} onClick={() => setShowCreateAuthority(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <ButtonMenu
          disabled={!someSelected}
          alignment="left"
          trigger={
            <button className={`${styles.actionButton} ${!someSelected ? styles.actionButtonDisabled : ''}`}>
              <span>Actions</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{ transition: 'transform 0.2s' }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          }
        >
          <div className={styles.menuItem} onClick={handleDelete}>
            Delete
          </div>
        </ButtonMenu>

        <input
          type="text"
          className={styles.searchBox}
          placeholder="Search authorities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.authorityList}>
        {filteredAuthorities.map(authority => (
          <Row key={authority.id}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selectedAuthorityIds.has(authority.id)}
              onChange={(e) => handleSelectAuthority(authority.id, e.target.checked)}
            />
            <div className={styles.authorityInfo} onClick={() => handleEditAuthority(authority.id)} style={{ cursor: 'pointer' }}>
              {authority.icon ? (
                <div className={styles.iconPlaceholder}>
                  <img src={authority.icon} alt={authority.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                </div>
              ) : (
                <div className={styles.iconPlaceholder}>
                  {authority.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.nameColumn}>
                <div className={styles.authorityName}>{authority.name}</div>
              </div>
            </div>
            <div className={styles.statusColumn}>
              {authority.isAdmin && (
                <span className={`${styles.badge} ${styles.badgeAdmin}`}>
                  Administrator
                </span>
              )}
            </div>
          </Row>
        ))}

        {filteredAuthorities.length === 0 && (
          <div className={styles.emptyState}>
            No authorities found
          </div>
        )}
      </div>
    </div>
  );
}
