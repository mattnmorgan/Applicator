import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/managers/user";
import { sendNtfyNotification } from "@/lib/system/ntfy";
import SettingManager from "@/lib/managers/setting";

/**
 * POST /api/system/settings/user/ntfy/test
 * Sends a test NTFY push notification to the current user.
 * Requires the user to have a UUID and NTFY to be configured.
 */
export async function POST() {
  try {
    const currentUserResult = await getCurrentUser();
    if (!currentUserResult) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = currentUserResult.user;

    if (!user.data.ntfy_uuid) {
      return NextResponse.json(
        { error: "No notification UUID configured. Generate one first." },
        { status: 400 },
      );
    }

    const settingManager = new SettingManager();
    const serverUrl = await settingManager.readRecord("ntfyServerUrl");
    const username = await settingManager.readRecord("ntfyUsername");
    const password = await settingManager.readRecord("ntfyPassword");

    if (
      !serverUrl?.data.value ||
      !username?.data.value ||
      !password?.data.value
    ) {
      return NextResponse.json(
        { error: "NTFY is not configured by your administrator." },
        { status: 403 },
      );
    }

    await sendNtfyNotification(
      user.id,
      "Test Notification",
      "If you can read this, NTFY push notifications are working correctly.",
      "success",
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send test notification:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 },
    );
  }
}
