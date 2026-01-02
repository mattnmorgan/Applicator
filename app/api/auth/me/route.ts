import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAuthority, getUserAuthorizations, getAllApps } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const profilePictureUrl = user.profilePicture ? `/api/assets/users/icons/${user.id}?t=${Date.now()}` : undefined;

    // Get user's authority to determine available apps
    const authority = await getAuthority(user.authority);
    const authorizations = await getUserAuthorizations(user.id);

    // Get user's apps from their authority
    let userApps: any[] = [];
    if (authority && authority.apps) {
      const allApps = await getAllApps();
      userApps = allApps
        .filter(app => authority.apps.includes(app.id))
        .map(app => ({
          id: app.id,
          label: app.label,
        }));
    }

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        authority: user.authority,
        isAdmin: authorizations.includes('admin'),
        profilePicture: profilePictureUrl,
      },
      authorizations,
      userApps,
    });
  } catch (error) {
    console.error('Failed to get current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}
