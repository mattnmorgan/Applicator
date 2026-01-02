import { NextResponse } from 'next/server';
import { getAllUsers, getAuthority } from '@/lib/db';

export async function GET() {
  try {
    const users = await getAllUsers();

    // Remove password hashes and add isAdmin and authorityName from authority
    const sanitizedUsers = await Promise.all(
      users.map(async ({ passwordHash, ...user }) => {
        const authority = await getAuthority(user.authority);
        return {
          ...user,
          isAdmin: authority?.isAdmin || false,
          authorityName: authority?.name || 'Unknown',
          profilePicture: user.profilePicture ? `/api/assets/users/icons/${user.id}?t=${Date.now()}` : undefined,
        };
      })
    );

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
