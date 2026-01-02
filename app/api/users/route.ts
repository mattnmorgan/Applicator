import { NextResponse } from 'next/server';
import { getAllUsers, getAuthority } from '@/lib/db';

export async function GET() {
  try {
    const users = await getAllUsers();

    // Remove password hashes and add authorityName from authority
    const sanitizedUsers = await Promise.all(
      users.map(async ({ passwordHash, ...user }) => {
        const authority = await getAuthority(user.authority);
        return {
          ...user,
          authorityName: authority?.name || 'Unknown',
          profilePicture: user.profilePicture ? `/api/assets/users/icons/${user.id}?t=${Date.now()}` : undefined,
        };
      })
    );

    // Sort users alphabetically by display name
    sanitizedUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
