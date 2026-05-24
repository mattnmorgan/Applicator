import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/managers/user";
import UserManager from "@/lib/managers/user";
import AuthorityManager from "@/lib/managers/authority";
import AppletManager from "@/lib/managers/applet";
import SettingManager from "@/lib/managers/setting";

const SETTING_KEY = (userId: string) => `${userId}:hotbar:pins`;

async function getAccessibleAppletIds(userId: string): Promise<Set<string>> {
  const authorityManager = new AuthorityManager();
  const userManager = new UserManager();
  const userRecord = await userManager.readRecord(userId);
  if (!userRecord) return new Set();

  const mainAuthority = await authorityManager.readRecord(userRecord.data.authority_id);
  const userAuthority = await authorityManager.readUserAuthority(userId);

  return new Set([
    ...(mainAuthority?.data.apps || []),
    ...(userAuthority?.data.apps || []),
  ]);
}

async function readPins(userId: string): Promise<string[]> {
  const settingManager = new SettingManager();
  const setting = await settingManager.readRecord(SETTING_KEY(userId));
  if (!setting?.data.value) return [];
  try {
    const parsed = JSON.parse(setting.data.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePins(userId: string, pins: string[]): Promise<void> {
  const settingManager = new SettingManager();
  if (pins.length === 0) {
    const existing = await settingManager.readRecord(SETTING_KEY(userId));
    if (existing) await settingManager.deleteRecord(SETTING_KEY(userId));
    return;
  }
  const table = await settingManager.getTable();
  await settingManager.upsertRecord(table, SETTING_KEY(userId), {
    value: JSON.stringify(pins),
    name: "hotbar:pins",
    user: userId,
  });
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = currentUser.user.id;
  const [pins, accessibleIds] = await Promise.all([
    readPins(userId),
    getAccessibleAppletIds(userId),
  ]);

  // Only return pins for applets the user still has access to
  const validPins = pins.filter((id) => accessibleIds.has(id));

  // Clean up stale pins in the background
  if (validPins.length !== pins.length) {
    writePins(userId, validPins).catch(() => {});
  }

  return NextResponse.json({ pinnedAppletIds: validPins });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = currentUser.user.id;
  const { appletId } = await request.json();
  if (!appletId) return NextResponse.json({ error: "appletId required" }, { status: 400 });

  // Verify applet exists and user has access
  const [accessibleIds, appletManager] = await Promise.all([
    getAccessibleAppletIds(userId),
    Promise.resolve(new AppletManager()),
  ]);
  if (!accessibleIds.has(appletId)) {
    return NextResponse.json({ error: "Applet not accessible" }, { status: 403 });
  }
  const applet = await appletManager.readRecord(appletId);
  if (!applet || applet.data.target !== "app") {
    return NextResponse.json({ error: "Invalid applet" }, { status: 400 });
  }

  const pins = await readPins(userId);
  if (!pins.includes(appletId)) {
    pins.push(appletId);
    await writePins(userId, pins);
  }

  return NextResponse.json({ pinnedAppletIds: pins });
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = currentUser.user.id;
  const { appletId } = await request.json();
  if (!appletId) return NextResponse.json({ error: "appletId required" }, { status: 400 });

  const pins = await readPins(userId);
  const updated = pins.filter((id) => id !== appletId);
  await writePins(userId, updated);

  return NextResponse.json({ pinnedAppletIds: updated });
}
