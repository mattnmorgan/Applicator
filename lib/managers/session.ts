import CRUD from "@/lib/database/crud";
import Session from "@/lib/database/types/session";
import UserManager from "@/lib/managers/user";
import { NextRequest } from "next/server";

export default class SessionManager extends CRUD<Session> {
  tableName = "sessions";
  appId = "system";

  async createSession(
    uid: string,
    originalSessionId: string | null = null,
    deviceInfo: {
      device_name?: string;
      browser_name?: string;
      device_type?: string;
    } = {},
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const record = await super.createRecord(await this.getTable(), {
      user_id: uid,
      expires_at: expiresAt.toISOString(),
      original_session_id: originalSessionId ?? undefined,
      ...deviceInfo,
    });
    // Session expiry is checked on read in getSession() — no Redis expire needed

    return record;
  }

  async getSessionsByUserId(userId: string) {
    return await this.readRecords({
      filters: [{ field: "user_id", operator: "=", value: userId }],
    });
  }
}

export async function getSession(id: string): Promise<Session | null> {
  const manager = new SessionManager();
  const record = await manager.readRecord(id);

  if (!record) {
    return null;
  }

  if (new Date(record.data.expires_at) < new Date()) {
    await manager.deleteRecord(record.id);
    return null;
  }

  const user = await new UserManager().readRecord(record.data.user_id);

  if (!user || !user.data.is_active) {
    await manager.deleteRecord(record.id);
    return null;
  }

  return record.data;
}

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<Session | null> {
  const id = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("session="))
    ?.split("=")[1];
  return !id ? null : await getSession(id);
}
