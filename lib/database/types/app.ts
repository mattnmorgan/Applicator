import AppVersion from "@/lib/database/types/appVersion";

export default interface App {
  label: string;
  version: AppVersion;
  author: string;
  contactEmail: string;
  description: string;
  dependencies?: Record<string, AppVersion>;
}
