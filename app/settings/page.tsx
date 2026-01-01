import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isFirstTimeSetup } from '@/lib/db';
import Navigation from '../components/Navigation';

export default async function SettingsPage() {
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
    <>
      <Navigation displayName={user.displayName} />
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        padding: '20px',
        paddingTop: '84px',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#f1f5f9'
          }}>
            Settings
          </h1>
          <div style={{
            background: '#1e293b',
            padding: '30px',
            borderRadius: '10px',
            border: '1px solid #334155'
          }}>
            <p style={{
              color: '#94a3b8',
              fontSize: '16px'
            }}>
              Settings page coming soon...
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
