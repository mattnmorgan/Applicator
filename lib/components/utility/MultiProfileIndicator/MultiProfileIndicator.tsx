'use client';

import { useState } from 'react';
import Tooltip from '../Tooltip';

export interface ProfileUser {
  id: string;
  displayName: string;
  profilePicture?: string;
}

interface MultiProfileIndicatorProps {
  users: ProfileUser[];
  maxVisible?: number;
  size?: number;
}

/** Deterministic color from a string */
function stringToColor(str: string): string {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function MultiProfileIndicator({ users, maxVisible = 3, size = 28 }: MultiProfileIndicatorProps) {
  const [hovered, setHovered] = useState(false);

  if (!users || users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.slice(maxVisible);

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {visible.map((user, i) => (
        <div
          key={user.id}
          style={{
            position: 'relative',
            zIndex: visible.length - i,
            marginLeft: i === 0 ? 0 : hovered ? 4 : -Math.floor(size * 0.4),
            transition: 'margin-left 0.15s ease',
          }}
        >
          <Tooltip text={user.displayName || '?'} placement="top">
            <div
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #0f172a',
                cursor: 'default',
              }}
            >
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.displayName || '?'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: stringToColor(user.displayName || user.id || '?'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: Math.floor(size * 0.4),
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {(user.displayName || user.id || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Tooltip>
        </div>
      ))}

      {overflow.length > 0 && (
        <Tooltip text={overflow.map((u) => u.displayName || '?').join(', ')} placement="top">
          <div
            style={{
              position: 'relative',
              zIndex: 0,
              marginLeft: hovered ? 4 : -Math.floor(size * 0.4),
              transition: 'margin-left 0.15s ease',
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: '#334155',
              border: '2px solid #0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.floor(size * 0.35),
              fontWeight: 700,
              color: '#94a3b8',
              cursor: 'default',
            }}
          >
            +{overflow.length}
          </div>
        </Tooltip>
      )}
    </div>
  );
}
