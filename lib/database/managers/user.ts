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
        authorizations.push(authority.data.authorizations);
      }
    }

    return {
      user,
      authorities: authorityIds,
      authorizations,
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
