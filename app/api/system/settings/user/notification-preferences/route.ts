import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/managers/user";
import SettingManager from "@/lib/managers/setting";
import NotificationTopicManager from "@/lib/managers/notificationTopic";
import AppManager from "@/lib/managers/app";

interface TopicPreference {
  internal: boolean;
  external: boolean;
}

async function getUserPrefs(
  userId: string,
): Promise<Record<string, TopicPreference>> {
  const settingManager = new SettingManager();
  const prefRecord = await settingManager.readRecord(
    `${userId}:notification-preferences`,
  );
  if (!prefRecord?.data.value) return {};
  try {
    return JSON.parse(prefRecord.data.value) as Record<string, TopicPreference>;
  } catch {
    return {};
  }
}

/**
 * GET /api/system/settings/user/notification-preferences
 * Returns all registered notification topics grouped by app, with the current
 * user's per-channel (internal / external) preferences merged in.
 */
export async function GET() {
  try {
    const currentUserResult = await getCurrentUser();
    if (!currentUserResult) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = currentUserResult.user.id;

    // Load all notification topics and app names in parallel
    const topicManager = new NotificationTopicManager();
    const appManager = new AppManager();

    const [topicsResult, appsResult, prefs] = await Promise.all([
      topicManager.readRecords({}),
      appManager.readRecords({}),
      getUserPrefs(userId),
    ]);

    const appNameMap: Record<string, string> = {};
    for (const app of appsResult.records) {
      appNameMap[app.id] = app.data.label;
    }

    const topics = topicsResult.records.map((t) => {
      const topicKey = t.id; // "{appId}:{topicId}"
      const pref = prefs[topicKey];
      return {
        id: topicKey,
        appId: t.data.app,
        appName: appNameMap[t.data.app] || t.data.app,
        name: t.data.name,
        summary: t.data.summary,
        ntfyTag: t.data.ntfy_tag || null,
        internal: pref?.internal !== false,
        external: pref?.external !== false,
      };
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Failed to get notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to get notification preferences" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/system/settings/user/notification-preferences
 * Body: { topicId: string, internal?: boolean, external?: boolean }
 * Updates the current user's preference for a single topic.
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUserResult = await getCurrentUser();
    if (!currentUserResult) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = currentUserResult.user.id;
    const body = await request.json();
    const { topicId, internal, external } = body;

    if (!topicId || typeof topicId !== "string") {
      return NextResponse.json(
        { error: "topicId is required" },
        { status: 400 },
      );
    }

    // Validate that the topic exists
    const topicManager = new NotificationTopicManager();
    const topic = await topicManager.readRecord(topicId);
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const settingManager = new SettingManager();
    const settingKey = `${userId}:notification-preferences`;
    const prefs = await getUserPrefs(userId);

    prefs[topicId] = {
      internal: internal !== false,
      external: external !== false,
    };

    const settingTable = await settingManager.getTable();
    await settingManager.upsertRecord(
      settingTable,
      settingKey,
      {
        value: JSON.stringify(prefs),
        name: "notification-preferences",
        user: userId,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 },
    );
  }
}
