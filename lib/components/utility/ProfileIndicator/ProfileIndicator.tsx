'use client';

import styles from './ProfileIndicator.module.css';

interface ProfileIndicatorProps {
  displayName: string;
  profilePicture?: string;
  /** Avatar size in px. Scales the avatar and display name proportionally. Defaults to 24. */
  size?: number;
}

export default function ProfileIndicator({ displayName, profilePicture, size = 24 }: ProfileIndicatorProps) {
  const firstLetter = displayName.charAt(0).toUpperCase();
  const nameFontSize = Math.round(size * (14 / 24));
  const letterFontSize = Math.round(size * (11 / 24));
  const gap = Math.round(size * (8 / 24));
  const paddingV = Math.round(size * (6 / 24));
  const paddingH = Math.round(size * (10 / 24));

  return (
    <div className={styles.container} style={{ gap, padding: `${paddingV}px ${paddingH}px` }}>
      <div
        className={`${styles.avatar} ${profilePicture ? styles.avatarWithImage : styles.avatarPlaceholder}`}
        style={{ width: size, height: size }}
      >
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={displayName}
            className={styles.avatarImage}
          />
        ) : (
          <span className={styles.avatarLetter} style={{ fontSize: letterFontSize }}>
            {firstLetter}
          </span>
        )}
      </div>
      <span className={styles.displayName} style={{ fontSize: nameFontSize }}>
        {displayName}
      </span>
    </div>
  );
}
