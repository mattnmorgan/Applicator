import CRUD from "@/lib/database/crud";
import Session from "@/lib/database/types/session";
import UserManager from "@/lib/database/managers/user";
import { NextRequest } from "next/server";

export default class SessionManager extends CRUD<Session> {
  tableName = "session";
  appId = "system";

  async createSession(uid: string, originalSessionId: string | null = null) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const record = await super.createRecord(await this.getTable(), {
      userId: uid,
      expiresAt: expiresAt.toISOString(),
      originalSessionId,
    });
    await this.getRedisClient().expire(
      `${this.tableName}:${record.id}`,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000)
    );

    return record;
  }
}

export async function getSession(id: string): Promise<Session | null> {
  const manager = new SessionManager();
  const record = await manager.readRecord(id);

  if (!record) {
    return null;
  }

  if (new Date(record.data.expiresAt) < new Date()) {
    await manager.deleteRecord(record.id);
    return null;
  }

  const user = await new UserManager().readRecord(record.data.userId);

  if (!user || !user.data.isActive) {
    await manager.deleteRecord(record.id);
    return null;
  }

  return record.data;
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<Session | null> {
  const id = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("session="))
    ?.split("=")[1];
  return !id ? null : await getSession(id);
}
