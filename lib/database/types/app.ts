import AppVersion from "@/lib/database/types/appVersion";
import Widget from "@/lib/database/types/widget";

export interface SubApp {
  id: string;
  label: string;
  description: string;
  component: string;
  widgets?: Widget[];
}

export default interface App {
  label: string;
  version: AppVersion;
  author: string;
  contactEmail: string;
  description: string;
  subApps?: SubApp[];
  dependencies?: Record<string, AppVersion>;
}
