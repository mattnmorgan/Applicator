import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isFirstTimeSetup } from '@/lib/db';
import { getBrandSettings } from '@/lib/brand';
import Navigation from '@/lib/components/Navigation';
import AppMenu from '@/lib/components/AppMenu/AppMenu';

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

  const profilePictureUrl = user.profilePicture ? `/api/system/assets/icons/users/${user.id}?t=${Date.now()}` : undefined;
  const brandSettings = await getBrandSettings();
  const hasAdminAuth = user.authorizations.includes('admin');

  return (
    <>
      <Navigation
        displayName={user.displayName}
        profilePicture={profilePictureUrl}
        isAdmin={hasAdminAuth}
        brandName={brandSettings.brandName}
        brandIcon={brandSettings.brandIcon}
        authorizations={user.authorizations}
        isAssumedIdentity={user.isAssumedIdentity}
      />
      <AppMenu />
      <div style={{
        position: 'fixed',
        top: '113px',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        overflow: 'hidden',
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
            fontSize: '16px'
          }}>
            Welcome to Applicator
          </p>
        </div>
      </div>
    </>
  );
}
