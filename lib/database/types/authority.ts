export default interface Authority {
  name: string;
  icon?: string;
  authorizations: string[];
  apps: string[];
  userId?: string;
  contextual?: boolean;
  app?: string;
}
