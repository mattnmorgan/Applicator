import { cookies } from 'next/headers';
import { getSession, getUserById, getUserAuthorizations, type User } from './db';

export async function getCurrentUser(): Promise<(User & { authorizations: string[]; isAssumedIdentity: boolean }) | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return null;
    }

    const session = await getSession(sessionId);
    if (!session) {
      return null;
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return null;
    }

    const authorizations = await getUserAuthorizations(user.id);
    const isAssumedIdentity = !!session.originalSessionId;

    return {
      ...user,
      authorizations,
      isAssumedIdentity,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
