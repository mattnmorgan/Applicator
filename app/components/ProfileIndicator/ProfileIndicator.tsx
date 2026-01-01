'use client';

import styles from './ProfileIndicator.module.css';

interface ProfileIndicatorProps {
  displayName: string;
  profilePicture?: string;
  isOpen?: boolean;
}

export default function ProfileIndicator({ displayName, profilePicture, isOpen = false }: ProfileIndicatorProps) {
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className={styles.container}>
      <div className={`${styles.avatar} ${profilePicture ? styles.avatarWithImage : styles.avatarPlaceholder}`}>
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={displayName}
            className={styles.avatarImage}
          />
        ) : (
          <span className={styles.avatarLetter}>
            {firstLetter}
          </span>
        )}
      </div>
      <span className={styles.displayName}>
        {displayName}
      </span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={`${styles.caret} ${isOpen ? styles.caretOpen : styles.caretClosed}`}
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
  );
}
