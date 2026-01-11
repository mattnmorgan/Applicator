export default interface Widget {
  name: string;
  description: string;
  target: "home" | "user-settings" | "system-settings";
  component: string;
  appId: string;
}
