export default interface Authorization {
  name: string;
  description: string;
  app: string;
  contextual?: boolean;
  target?: "user" | "app";
}
