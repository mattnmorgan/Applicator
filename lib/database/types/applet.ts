export default interface Applet {
  label: string;
  description: string;
  component: string;
  app: string;
  target: "app" | "home" | "user-settings" | "system-settings";
}
