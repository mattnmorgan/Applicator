import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

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

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        authority: user.authority,
        isAdmin: user.isAdmin,
        profilePicture: profilePictureUrl,
      }
    });
  } catch (error) {
    console.error('Failed to get current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}
