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
  appId: string;
}

export default interface App {
  id: string;
  label: string;
  version: AppVersion;
  author: string;
  contactEmail: string;
  description: string;
  apiRoutes?: ApiRoute[];
  widgets?: Widget[];
  /**
   * Map of app ids to minimum required versions for install to be permitted
   */
  dependencies?: Record<string, AppVersion>;
}
