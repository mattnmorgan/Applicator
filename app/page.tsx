import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isFirstTimeSetup } from '@/lib/db';
import LogoutButton from './LogoutButton';

export default async function HomePage() {
  // Check if first-time setup is needed
  const needsSetup = await isFirstTimeSetup();
  if (needsSetup) {
    redirect('/setup');
  }

  // Check if user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      padding: '20px'
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
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#f1f5f9'
        }}>
          Hello, {user.displayName}
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '16px',
          marginBottom: '10px'
        }}>
          Welcome to Applicator
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}
