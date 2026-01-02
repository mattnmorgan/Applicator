import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isFirstTimeSetup } from '@/lib/db';
import Navigation from '../components/Navigation';
import Tabset, { TabsetItem } from '../components/Tabset';

const settingsMenuItems: TabsetItem[] = [
  {
    label: 'Home',
    path: '/settings',
  },
  {
    label: 'User Management',
    clickable: false,
    children: [
      {
        label: 'Users',
        path: '/settings/user-management/users',
      },
    ],
  },
  {
    label: 'Debug',
    clickable: false,
    children: [
      {
        label: 'Database',
        path: '/settings/debug/database',
      },
    ],
  },
];

export default async function SettingsLayout({
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

  const profilePictureUrl = user.profilePicture ? `/api/assets/users/icons/${user.id}` : undefined;

  return (
    <>
      <Navigation displayName={user.displayName} profilePicture={profilePictureUrl} />
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
            <Tabset items={settingsMenuItems} variant="vertical" searchable />
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
