export interface AppletSettingDefinition {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "picklist" | "multipicklist";
  default?: any;
  options?: Record<string, string>;
}

export default interface Applet {
  label: string;
  description: string;
  component: string;
  app: string;
  target: "app" | "home" | "user-settings" | "system-settings" | "guest";
  settings?: AppletSettingDefinition[];
}
