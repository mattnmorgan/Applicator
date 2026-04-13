import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/managers/user";
import UserManager from "@/lib/managers/user";
import NotificationManager from "@/lib/managers/notification";
import SettingManager from "@/lib/managers/setting";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const currentUserResult = await getCurrentUser();
    if (!currentUserResult) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = currentUserResult.user;
    const hasUuid = !!user.data.ntfy_uuid;

    // Check if NTFY is configured at the system level
    const settingManager = new SettingManager();
    const serverUrl = await settingManager.readRecord("ntfyServerUrl");
    const username = await settingManager.readRecord("ntfyUsername");
    const password = await settingManager.readRecord("ntfyPassword");

    const ntfyConfigured = !!(
      serverUrl?.data.value &&
      username?.data.value &&
      password?.data.value
    );

    return NextResponse.json({
      hasUuid,
      ntfyConfigured,
      serverUrl: serverUrl?.data.value || null,
    });
  } catch (error) {
    console.error("Failed to get NTFY info:", error);
    return NextResponse.json(
      { error: "Failed to get NTFY information" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const currentUserResult = await getCurrentUser();
    if (!currentUserResult) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Block generation if NTFY is not configured
    const settingManager = new SettingManager();
    const serverUrlRecord = await settingManager.readRecord("ntfyServerUrl");
    const usernameRecord = await settingManager.readRecord("ntfyUsername");
    const passwordRecord = await settingManager.readRecord("ntfyPassword");

    if (
      !serverUrlRecord?.data.value ||
      !usernameRecord?.data.value ||
      !passwordRecord?.data.value
    ) {
      return NextResponse.json(
        { error: "NTFY is not configured. An administrator must set up the NTFY server before UUIDs can be generated." },
        { status: 403 },
      );
    }

    const user = currentUserResult.user;
    const oldUuid = user.data.ntfy_uuid;

    // If there's an existing UUID, notify it that it was revoked
    if (oldUuid) {
      const serverUrl = serverUrlRecord.data.value;
      const username = usernameRecord.data.value;
      const password = passwordRecord.data.value;

      if (serverUrl && username && password) {
        try {
          const credentials = Buffer.from(`${username}:${password}`).toString("base64");
          await fetch(`${serverUrl.replace(/\/$/, "")}/${oldUuid}`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              Title: "Notification UUID Revoked",
              Tags: "warning",
              "Content-Type": "text/plain",
            },
            body: "Your notification UUID has been regenerated. This device will no longer receive notifications. Please update your NTFY subscription.",
          });
        } catch {
          // Non-fatal: proceed even if the revocation notification fails
        }
      }
    }

    // Generate new UUID and save it
    const newUuid = uuidv4();
    const userManager = new UserManager();
    await userManager.updateRecord(
      await userManager.getTable(),
      user.id,
      { ...user.data, ntfy_uuid: newUuid },
    );

    // Create an in-app notification as well
    const notificationManager = new NotificationManager();
    await notificationManager.createRecord(null, {
      type: "info",
      app: "system",
      title: "Notification UUID Regenerated",
      message: "Your NTFY notification UUID has been regenerated. Update your NTFY app subscription to continue receiving notifications.",
      timestamp: Date.now(),
      read: false,
      archived: false,
      user_id: user.id,
    });

    return NextResponse.json({ success: true, uuid: newUuid });
  } catch (error) {
    console.error("Failed to regenerate NTFY UUID:", error);
    return NextResponse.json(
      { error: "Failed to regenerate UUID" },
      { status: 500 },
    );
  }
}
