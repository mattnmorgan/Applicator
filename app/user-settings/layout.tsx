import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isFirstTimeSetup } from '@/lib/db';
import { getBrandSettings } from '@/lib/brand';
import Navigation from '../components/Navigation';
import Tabset, { TabsetItem } from '../components/Tabset';

const userSettingsMenuItems: TabsetItem[] = [
  {
    label: 'Profile',
    path: '/user-settings/profile',
  },
];

export default async function UserSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const profilePictureUrl = user.profilePicture ? `/api/assets/users/icons/${user.id}?t=${Date.now()}` : undefined;
  const hasAdminAuth = user.authorizations.includes('admin');
  const brandSettings = await getBrandSettings();

  return (
    <>
      <Navigation
        displayName={user.displayName}
        profilePicture={profilePictureUrl}
        isAdmin={hasAdminAuth}
        brandName={brandSettings.brandName}
        brandIcon={brandSettings.brandIcon}
      />
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: '#0f172a',
        paddingTop: '84px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          gap: '20px',
          height: 'calc(100vh - 104px)',
        }}>
          <aside style={{
            width: '250px',
            background: '#1e293b',
            padding: '20px',
            borderRadius: '10px',
            border: '1px solid #334155',
            overflowY: 'auto',
          }}>
            <Tabset items={userSettingsMenuItems} variant="vertical" searchable />
          </aside>
          <main style={{
            flex: 1,
            background: '#1e293b',
            padding: '20px',
            borderRadius: '10px',
            border: '1px solid #334155',
            overflowY: 'auto',
          }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
