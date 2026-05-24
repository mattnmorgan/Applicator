import AppletManager from "@/lib/managers/applet";
import AppManager from "@/lib/managers/app";
import AuthorityManager from "@/lib/managers/authority";
import UserManager from "@/lib/managers/user";
import { LauncherData, LauncherItem } from "@/lib/components/Navigation/Navigation";

const BUILTIN_USER_SETTINGS: LauncherItem[] = [
  { label: "Homescreen", href: "/user/settings/home" },
  { label: "Notifications", href: "/user/settings/notifications" },
  { label: "Profile", href: "/user/settings/profile" },
  { label: "Sessions", href: "/user/settings/sessions" },
];

const BUILTIN_SYSTEM_SETTINGS: LauncherItem[] = [
  { label: "Settings", href: "/system/settings" },
  { label: "Logs", href: "/system/settings/debug/logs" },
  { label: "Users", href: "/system/settings/user-management/users" },
  { label: "Authorities", href: "/system/settings/user-management/access-management/authorities" },
  { label: "Authorizations", href: "/system/settings/user-management/access-management/authorizations" },
  { label: "App Access Manager", href: "/system/settings/user-management/access-management/app-access" },
  { label: "App Permissions Manager", href: "/system/settings/user-management/access-management/app-permissions" },
  { label: "Permissions Manager", href: "/system/settings/user-management/access-management/permissions" },
  { label: "Agents", href: "/system/settings/agents" },
  { label: "Apps", href: "/system/settings/apps" },
  { label: "Tables", href: "/system/settings/data-models" },
];

const BUILTIN_DEV_MENU: LauncherItem[] = [
  { label: "Development Settings", href: "/dev/settings" },
  { label: "API Endpoints", href: "/dev/test/api-endpoints" },
  { label: "Dynamic Inputs", href: "/dev/test/dynamic-inputs" },
  { label: "Logs", href: "/dev/test/logs" },
  { label: "Notifications", href: "/dev/test/notifications" },
  { label: "Form Editor and Viewer", href: "/dev/test/form-editor" },
  { label: "Panels", href: "/dev/test/panels" },
  { label: "Database", href: "/dev/utilities/database" },
  { label: "Elasticsearch", href: "/dev/utilities/elasticsearch" },
];

export async function getLauncherData(
  userId: string,
  authorizations: string[],
): Promise<LauncherData> {
  const userManager = new UserManager();
  const authorityManager = new AuthorityManager();
  const appletManager = new AppletManager();
  const appManager = new AppManager();

  const userRecord = await userManager.readRecord(userId);
  if (!userRecord) {
    return { apps: [], userSettings: [...BUILTIN_USER_SETTINGS] };
  }

  const mainAuthority = await authorityManager.readRecord(
    userRecord.data.authority_id,
  );
  const userAuthority = await authorityManager.readUserAuthority(userId);

  const appletIds = [
    ...(mainAuthority?.data.apps || []),
    ...(userAuthority?.data.apps || []),
  ];
  const uniqueAppletIds = new Set(appletIds);

  const [allAppletsResult, allAppsResult] = await Promise.all([
    appletManager.readRecords(),
    appManager.readRecords(),
  ]);

  const appLabelMap = new Map<string, string>();
  for (const app of allAppsResult.records) {
    appLabelMap.set(app.id, app.data.label);
  }

  const accessibleApplets = allAppletsResult.records.filter((a) =>
    uniqueAppletIds.has(a.id),
  );

  const apps: LauncherItem[] = accessibleApplets
    .filter((a) => a.data.target === "app")
    .map((a) => ({
      label: a.data.label,
      href: `/app/${a.id}`,
      appletId: a.id,
      appIconUrl: `/api/${a.data.app}/assets/icon`,
      appLabel: appLabelMap.get(a.data.app) ?? a.data.app,
      description: a.data.description || undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const userSettingsApplets: LauncherItem[] = accessibleApplets
    .filter((a) => a.data.target === "user-settings")
    .map((a) => ({
      label: a.data.label,
      href: `/user/settings/applet/${a.id}`,
      appIconUrl: `/api/${a.data.app}/assets/icon`,
      appLabel: appLabelMap.get(a.data.app) ?? a.data.app,
      description: a.data.description || undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const userSettings: LauncherItem[] = [
    ...BUILTIN_USER_SETTINGS,
    ...userSettingsApplets,
  ].sort((a, b) => a.label.localeCompare(b.label));

  let systemSettings: LauncherItem[] | undefined;
  if (authorizations.includes("system:admin")) {
    const systemSettingsApplets: LauncherItem[] = accessibleApplets
      .filter((a) => a.data.target === "system-settings")
      .map((a) => ({
        label: a.data.label,
        href: `/system/settings/applet/${a.id}`,
        appIconUrl: `/api/${a.data.app}/assets/icon`,
        appLabel: appLabelMap.get(a.data.app) ?? a.data.app,
        description: a.data.description || undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    systemSettings = [...BUILTIN_SYSTEM_SETTINGS, ...systemSettingsApplets]
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const devMenu = authorizations.includes("system:developer")
    ? [...BUILTIN_DEV_MENU].sort((a, b) => a.label.localeCompare(b.label))
    : undefined;

  return { apps, userSettings, systemSettings, devMenu };
}
