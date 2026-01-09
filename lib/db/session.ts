import { getRedisClient } from "../redis";
import Session from "@/lib/database/types/session";
import { v4 as uuidv4 } from "uuid";
import { getUserById } from "./user";

/**
 * Create a new session
 */
export async function createSession(userId: string): Promise<Session> {
  const redis = getRedisClient();
  const sessionId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const session: Session = {
    id: sessionId,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Store session with expiry
  const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(session));

  return session;
}

/**
 * Get a session by ID
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
    await deleteSession(sessionId);
    return null;
  }

  // Check if user is still active
  const user = await getUserById(session.userId);
  if (!user || !user.isActive) {
    // User is inactive or doesn't exist, delete the session
    await deleteSession(sessionId);
    return null;
  }

  return session;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`session:${sessionId}`);
}
