export default interface AppletSetting {
  user: string;
  applet: string;
  label?: string;
  settings: Record<string, any>;
}
