import { cookies } from "next/headers";
import CRUD from "@/lib/database/crud";
import User from "@/lib/database/types/user";
import { getSession } from "@/lib/database/managers/session";
import AuthorityManager from "@/lib/database/managers/authority";
import bcrypt from "bcryptjs";
import TableRecord from "@/lib/database/crud/types/record";

export default class UserManager extends CRUD<User> {
  tableName = "user";
  appId = "system";
}

export async function getCurrentUser(): Promise<{
  user: TableRecord<User>;
  authorities: string[];
  authorizations: string[];
  isAssumedIdentity: boolean;
} | null> {
  try {
    const session = await getSession((await cookies()).get("session")?.value);
    const user = await new UserManager().readRecord(session.userId);

    if (!user) {
      return null;
    }

    const authorityManager = new AuthorityManager();

    const authorities = [
      await authorityManager.readRecord(user.data.authority),
      await authorityManager.readUserAuthority(user.id),
    ];
    const authorityIds = [];
    const authorizations = [];

    for (const authority of authorities) {
      if (authority) {
        authorityIds.push(authority.id);
        authorizations.push(...authority.data.authorizations);
      }
    }

    return {
      user,
      authorities: authorityIds,
      authorizations: Array.from(new Set(authorizations)),
      isAssumedIdentity: !!session.originalSessionId,
    };
  } catch (error) {
    console.error("Unable to read current user: ", error);
    return null;
  }
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Get all authorizations for a user
 */
export async function getUserAuthorizations(userId: string): Promise<string[]> {
  const userManager = new UserManager();
  const authorityManager = new AuthorityManager();

  const userRecord = await userManager.readRecord(userId);
  if (!userRecord) return [];

  const mainAuthority = await authorityManager.readRecord(userRecord.data.authority);
  const userAuthority = await authorityManager.readUserAuthority(userId);

  const authorizations = new Set<string>();
  if (mainAuthority) {
    mainAuthority.data.authorizations.forEach(auth => authorizations.add(auth));
  }
  if (userAuthority) {
    userAuthority.data.authorizations.forEach(auth => authorizations.add(auth));
  }

  return Array.from(authorizations);
}

/**
 * Check if a user has specific authorization(s)
 * @param userId - The user ID to check
 * @param authorizations - Single authorization string or array of authorizations
 * @param requireAll - If true, user must have ALL authorizations. If false (default), user must have ANY
 */
export async function userHasAuthorization(
  userId: string,
  authorizations: string | string[],
  requireAll: boolean = false
): Promise<boolean> {
  const userAuths = await getUserAuthorizations(userId);
  const requiredAuths = Array.isArray(authorizations) ? authorizations : [authorizations];

  if (requireAll) {
    return requiredAuths.every(auth => userAuths.includes(auth));
  } else {
    return requiredAuths.some(auth => userAuths.includes(auth));
  }
}
