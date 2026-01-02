import { getRedisClient } from './redis';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface Authority {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authority: string;
  isActive: boolean;
  profilePicture?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

// Authority management
export async function createAuthority(id: string, name: string, isAdmin: boolean): Promise<Authority> {
  const redis = getRedisClient();

  const authority: Authority = {
    id,
    name,
    isAdmin,
  };

  await redis.set(`authority:${id}`, JSON.stringify(authority));
  return authority;
}

export async function getAuthority(id: string): Promise<Authority | null> {
  const redis = getRedisClient();
  const authorityData = await redis.get(`authority:${id}`);

  if (!authorityData) {
    return null;
  }

  return JSON.parse(authorityData) as Authority;
}

export async function initializeAuthorities(): Promise<void> {
  const redis = getRedisClient();

  // Check if authorities already exist
  const existingAdmin = await redis.get('authority:admin');
  if (existingAdmin) {
    return; // Authorities already initialized
  }

  // Create the three default authorities
  await createAuthority('admin', 'Administrator', true);
  await createAuthority('user', 'User', false);
  await createAuthority('guest', 'Guest', false);
}

export async function getAllAuthorities(): Promise<Authority[]> {
  const redis = getRedisClient();
  const keys = await redis.keys('authority:*');

  const authorities: Authority[] = [];
  for (const key of keys) {
    const authorityData = await redis.get(key);
    if (authorityData) {
      authorities.push(JSON.parse(authorityData) as Authority);
    }
  }

  return authorities;
}

// User management
export async function createUser(
  username: string,
  email: string,
  displayName: string,
  password: string,
  authority: string = 'user'
): Promise<User> {
  const redis = getRedisClient();
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  const user: User = {
    id: userId,
    username,
    email,
    displayName,
    passwordHash,
    authority,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // Store user data
  await redis.set(`user:${userId}`, JSON.stringify(user));

  // Create username -> userId mapping for login
  await redis.set(`user:username:${username}`, userId);

  return user;
}

export async function getUserWithAuthority(userId: string): Promise<(User & { isAdmin: boolean }) | null> {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  const authority = await getAuthority(user.authority);
  return {
    ...user,
    isAdmin: authority?.isAdmin || false,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const redis = getRedisClient();
  const userData = await redis.get(`user:${userId}`);

  if (!userData) {
    return null;
  }

  return JSON.parse(userData) as User;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const redis = getRedisClient();
  const userId = await redis.get(`user:username:${username}`);

  if (!userId) {
    return null;
  }

  return getUserById(userId);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function getAllUsers(): Promise<User[]> {
  const redis = getRedisClient();
  const keys = await redis.keys('user:*');

  // Filter out username mapping keys
  const userKeys = keys.filter(key => !key.includes('user:username:'));

  const users: User[] = [];
  for (const key of userKeys) {
    const userData = await redis.get(key);
    if (userData) {
      users.push(JSON.parse(userData) as User);
    }
  }

  return users;
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  const redis = getRedisClient();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.isActive = isActive;
  await redis.set(`user:${userId}`, JSON.stringify(user));
}

export async function updateUser(userId: string, updates: Partial<Omit<User, 'id'>>): Promise<void> {
  const redis = getRedisClient();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = { ...user, ...updates };
  await redis.set(`user:${userId}`, JSON.stringify(updatedUser));
}

// Session management
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

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`session:${sessionId}`);
}

// System settings
export async function getSystemSetting(key: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(`settings:system:${key}`);
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`settings:system:${key}`, value);
}

export async function isFirstTimeSetup(): Promise<boolean> {
  const adminUserId = await getSystemSetting('administratorUserId');
  return adminUserId === null;
}
