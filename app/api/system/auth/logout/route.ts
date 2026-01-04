import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, getSession } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (sessionId) {
      // Get the current session to check if it's an assumed identity
      const session = await getSession(sessionId);

      if (session?.originalSessionId) {
        // User is logged in with an assumed identity
        // Restore the original session instead of logging out
        await deleteSession(sessionId); // Delete the assumed session

        // Set cookie back to original session
        cookieStore.set('session', session.originalSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return NextResponse.json({ success: true, unassumed: true });
      } else {
        // Normal logout - delete the session
        await deleteSession(sessionId);

        // Clear session cookie
        cookieStore.delete('session');

        return NextResponse.json({ success: true });
      }
    }

    // No session found, just clear cookie
    cookieStore.delete('session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
