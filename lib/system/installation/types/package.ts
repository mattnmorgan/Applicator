import AdmZip from "adm-zip";
import AppMetadata from "@/lib/system/installation/types/package-metadata";

export default interface AppPackage {
  appAttributes: AppMetadata;
  uiBundle: string;
  iconData: Buffer | null;
  apiHandlers: Map<string, Buffer>;
  assets: Map<string, Buffer>;
  tables: Map<string, Buffer>;
  agents: Map<string, Buffer>;
  system: Map<string, Buffer>;
  zip: AdmZip;
}
