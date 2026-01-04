import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/auth';
import { getUserById, userHasAuthorization } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';
import type { Session } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has assume-identity authorization
    const hasAssumeIdentity = await userHasAuthorization(currentUser.id, 'assume-identity');
    if (!hasAssumeIdentity) {
      return NextResponse.json({ error: 'Forbidden - You do not have permission to assume identities' }, { status: 403 });
    }

    // Get target user ID from request
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify target user exists and is active
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.isActive) {
      return NextResponse.json({ error: 'Cannot assume identity of inactive user' }, { status: 400 });
    }

    // Get current session ID
    const cookieStore = await cookies();
    const currentSessionId = cookieStore.get('session')?.value;
    if (!currentSessionId) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Create a new session for the assumed identity
    const redis = getRedisClient();
    const newSessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const newSession: Session = {
      id: newSessionId,
      userId: targetUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      originalSessionId: currentSessionId, // Store reference to original session
    };

    // Store new session in Redis
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await redis.setex(`session:${newSessionId}`, ttl, JSON.stringify(newSession));

    // Update the session cookie to use the new session
    cookieStore.set('session', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assumed identity of ${targetUser.displayName}`,
    });
  } catch (error) {
    console.error('Assume identity error:', error);
    return NextResponse.json(
      { error: 'Failed to assume identity' },
      { status: 500 }
    );
  }
}
