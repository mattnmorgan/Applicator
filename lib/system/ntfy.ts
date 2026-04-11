import UserManager from "@/lib/managers/user";
import SettingManager from "@/lib/managers/setting";

const NTFY_TAGS: Record<string, string> = {
  info: "information_source",
  success: "white_check_mark",
  warning: "warning",
  error: "rotating_light",
};

export async function sendNtfyNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  ntfyTag?: string,
): Promise<void> {
  try {
    const userManager = new UserManager();
    const userRecord = await userManager.readRecord(userId);
    if (!userRecord?.data.ntfy_uuid) return;

    const settingManager = new SettingManager();
    const [serverUrlRecord, usernameRecord, passwordRecord, brandIconRecord, siteUrlRecord] =
      await Promise.all([
        settingManager.readRecord("ntfyServerUrl"),
        settingManager.readRecord("ntfyUsername"),
        settingManager.readRecord("ntfyPassword"),
        settingManager.readRecord("brandIcon"),
        settingManager.readRecord("siteUrl"),
      ]);

    const serverUrl = serverUrlRecord?.data.value;
    const username = usernameRecord?.data.value;
    const password = passwordRecord?.data.value;

    if (!serverUrl || !username || !password) return;

    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    const tag = ntfyTag || NTFY_TAGS[type] || NTFY_TAGS.info;

    const headers: Record<string, string> = {
      Authorization: `Basic ${credentials}`,
      Title: title,
      Tags: tag,
      "Content-Type": "text/plain",
    };

    const hasBrandIcon = brandIconRecord?.data.value === "true";
    const siteUrl = siteUrlRecord?.data.value?.replace(/\/$/, "");
    if (hasBrandIcon && siteUrl) {
      headers["Icon"] = `${siteUrl}/api/system/assets/brand`;
    }

    await fetch(`${serverUrl.replace(/\/$/, "")}/${userRecord.data.ntfy_uuid}`, {
      method: "POST",
      headers,
      body: message,
    });
  } catch {
    // Non-fatal: in-app notification already created
  }
}
