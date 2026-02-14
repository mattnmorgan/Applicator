import AppVersion from "@/lib/database/types/appVersion";

export default interface App {
  label: string;
  version: AppVersion;
  author: string;
  contact_email: string;
  description: string;
  dependencies?: Record<string, AppVersion>;
  required_permissions: string[];
}
