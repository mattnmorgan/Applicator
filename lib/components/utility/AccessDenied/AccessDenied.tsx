'use client';

interface AccessDeniedProps {
  message?: string;
}

export default function AccessDenied({ message = 'You do not have permission to access this page.' }: AccessDeniedProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      padding: '20px',
      paddingTop: '84px',
    }}>
      <div style={{
        background: '#1e293b',
        padding: '60px 40px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        maxWidth: '500px',
        border: '1px solid #334155'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 20px',
          background: '#7f1d1d',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fecaca" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#f1f5f9'
        }}>
          Access Denied
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '16px',
          marginBottom: '24px'
        }}>
          {message}
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
