'use client';

import styles from './ProfileIndicator.module.css';

interface ProfileIndicatorProps {
  displayName: string;
  profilePicture?: string;
}

export default function ProfileIndicator({ displayName, profilePicture }: ProfileIndicatorProps) {
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
    </div>
  );
}
