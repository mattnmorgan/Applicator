'use client';

import { useRouter } from 'next/navigation';
import ButtonMenu from '../ButtonMenu';
import ProfileIndicator from '../ProfileIndicator';
import styles from './Navigation.module.css';

interface NavigationProps {
  displayName: string;
  profilePicture?: string;
  isAdmin?: boolean;
  brandName?: string;
  brandIcon?: string;
}

export default function Navigation({ displayName, profilePicture, isAdmin = false, brandName = 'Applicator', brandIcon }: NavigationProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuOptions = [
    {
      label: 'User Settings',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      onClick: () => router.push('/user-settings'),
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
    {
      label: 'Logout',
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
    </nav>
  );
}
