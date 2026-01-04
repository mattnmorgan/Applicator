'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ButtonMenu from '../ButtonMenu';
import ProfileIndicator from '../ProfileIndicator';
import NotificationBell from '../NotificationBell';
import AssumeIdentityModal from '../AssumeIdentityModal/AssumeIdentityModal';
import styles from './Navigation.module.css';

interface NavigationProps {
  displayName: string;
  profilePicture?: string;
  isAdmin?: boolean;
  brandName?: string;
  brandIcon?: string;
  authorizations?: string[];
  isAssumedIdentity?: boolean;
}

export default function Navigation({ displayName, profilePicture, isAdmin = false, brandName = 'Applicator', brandIcon, authorizations = [], isAssumedIdentity = false }: NavigationProps) {
  const router = useRouter();
  const [showAssumeModal, setShowAssumeModal] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/system/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.unassumed) {
          // User unassumed identity, reload the page
          window.location.reload();
        } else {
          // Normal logout, redirect to login
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleAssumeIdentity = async (userId: string) => {
    try {
      const response = await fetch('/api/system/auth/assume-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Reload the page to reflect the new identity
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to assume identity');
      }
    } catch (error) {
      console.error('Assume identity failed:', error);
      alert('Failed to assume identity');
    }
  };

  const hasAssumeIdentity = authorizations.includes('assume-identity');

  const menuOptions = [
    {
      label: 'User Settings',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      onClick: () => router.push('/user/settings'),
    },
    ...(isAdmin ? [{
      label: 'System Settings',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2" />
        </svg>
      ),
      onClick: () => router.push('/settings'),
    }] : []),
    ...(hasAssumeIdentity ? [{
      label: 'Assume Identity',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      onClick: () => setShowAssumeModal(true),
    }] : []),
    {
      label: isAssumedIdentity ? 'Logout (Unassume Identity)' : 'Logout',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <nav className={styles.nav}>
        <div
          className={styles.title}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          {brandIcon && (
            <img
              src={brandIcon}
              alt="Brand icon"
              style={{
                height: '32px',
                width: '32px',
                objectFit: 'contain'
              }}
            />
          )}
          <h1 style={{ margin: 0, fontSize: '16px' }}>
            {brandName}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell />
          <ButtonMenu options={menuOptions}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ProfileIndicator displayName={displayName} profilePicture={profilePicture} />
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{ transition: 'transform 0.2s' }}
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </ButtonMenu>
        </div>
      </nav>

      {showAssumeModal && (
        <AssumeIdentityModal
          onClose={() => setShowAssumeModal(false)}
          onAssumeIdentity={handleAssumeIdentity}
        />
      )}
    </>
  );
}
