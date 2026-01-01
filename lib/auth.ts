import { cookies } from 'next/headers';
import { getSession, getUserById, type User } from './db';

export async function getCurrentUser(): Promise<User | null> {
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
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
