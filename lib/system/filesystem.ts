import { getSession } from "@/lib/sdk";
import { userHasAuthorization } from "@/lib/database/managers/user";
import AuthorityManager from "@/lib/database/managers/authority";
import SettingManager from "@/lib/database/managers/setting";

/**
 * Checks for file system access.
 *
 * @param request Request to validate filesystem access for
 * @returns Result for the access check
 */
export async function checkFsAccess(request: Request): Promise<{
  authorized: boolean;
  error?: string;
  status?: number;
}> {
  // Check if system storage is configured
  const settingManager = new SettingManager();
  const storageRecord = await settingManager.readRecord("storage");
  if (!storageRecord?.data.value) {
    return {
      authorized: false,
      error: "System storage not configured",
      status: 503,
    };
  }

  const cookieHeader = request.headers.get("cookie");
  const sessionId = cookieHeader?.match(/session=([^;]+)/)?.[1];

  if (!sessionId) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  // Check for app ID from header or query parameter (query param for window.open support)
  const url = new URL(request.url);
  const appId =
    request.headers.get("X-App-Id") || url.searchParams.get("appId");

  if (appId) {
    const authorityManager = new AuthorityManager();
    const appAuthority = await authorityManager.readAppSpecificAuthority(appId);

    if (
      appAuthority &&
      appAuthority.data.authorizations.includes("system:fs-access")
    ) {
      return { authorized: true };
    }
    return {
      authorized: false,
      error: "App does not have filesystem access",
      status: 403,
    };
  } else {
    const hasAdmin = await userHasAuthorization(session.userId, "system:admin");

    if (hasAdmin) {
      return { authorized: true };
    } else {
      return { authorized: false, error: "Forbidden", status: 403 };
    }
  }
}
