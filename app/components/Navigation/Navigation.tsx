'use client';

import { useRouter } from 'next/navigation';
import ButtonMenu from '../ButtonMenu';
import ProfileIndicator from '../ProfileIndicator';
import styles from './Navigation.module.css';

interface NavigationProps {
  displayName: string;
  profilePicture?: string;
}

export default function Navigation({ displayName, profilePicture }: NavigationProps) {
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
      label: 'Settings',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2" />
        </svg>
      ),
      onClick: () => router.push('/settings'),
    },
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
      <h1 className={styles.title}>
        Applicator
      </h1>

      <ButtonMenu options={menuOptions}>
        <ProfileIndicator displayName={displayName} profilePicture={profilePicture} />
      </ButtonMenu>
    </nav>
  );
}
