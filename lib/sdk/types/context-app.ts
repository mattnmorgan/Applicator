import ContextAuthority from "@/lib/sdk/types/context-authority";
import AppVersion from "@/lib/database/types/appVersion";

export default interface ContextApp {
  name: string;
  version: AppVersion;
  authority: ContextAuthority;
}
