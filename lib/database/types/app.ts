export interface AppVersion {
  major: number;
  minor: number;
  dev: number;
}

export interface ApiRoute {
  path: string;
  method: string;
  handler: string;
  description: string;
}

export interface Widget {
  id: string;
  name: string;
  description: string;
  target: "home" | "user-settings" | "system-settings";
  component: string;
  appId: string; // Format: "mainAppId:subAppId" for sub-app widgets
}

export interface SubApp {
  id: string; // Unique within parent app (e.g., "manager")
  label: string;
  description: string;
  component: string; // Component name in apps/ directory
  widgets?: Widget[]; // Widgets specific to this sub-app
}

export default interface App {
  id: string;
  label: string;
  version: AppVersion;
  author: string;
  contactEmail: string;
  description: string;
  apiRoutes?: ApiRoute[];
  subApps?: SubApp[]; // Sub-applications (if not provided, legacy format assumed)
  widgets?: Widget[]; // Legacy: widgets at app level (deprecated, use subApps)
  /**
   * Map of app ids to minimum required versions for install to be permitted
   */
  dependencies?: Record<string, AppVersion>;
}
