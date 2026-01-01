'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
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

  return (
    <button
      onClick={handleLogout}
      style={{
        marginTop: '20px',
        padding: '8px 20px',
        background: 'transparent',
        color: '#94a3b8',
        border: '1px solid #475569',
        borderRadius: '5px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#334155';
        e.currentTarget.style.color = '#f1f5f9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#94a3b8';
      }}
    >
      Logout
    </button>
  );
}
