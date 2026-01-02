import { getRedisClient } from '../redis';
import { getUserById } from '../db';

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Get a session by its ID
 * @param sessionId The session ID to retrieve
 * @returns The session if found and not expired, null otherwise
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const redis = getRedisClient();
  const sessionData = await redis.get(`session:${sessionId}`);

  if (!sessionData) {
    return null;
  }

  const session = JSON.parse(sessionData) as Session;

  // Check if session is expired
  if (new Date(session.expiresAt) < new Date()) {
    // Session is expired, delete it
    await redis.del(`session:${sessionId}`);
    return null;
  }

  // Check if user is still active
  const user = await getUserById(session.userId);
  if (!user || !user.isActive) {
    // User is inactive or doesn't exist, delete the session
    await redis.del(`session:${sessionId}`);
    return null;
  }

  return session;
}
