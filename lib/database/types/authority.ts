export default interface Authority {
  name: string;
  icon?: string;
  authorizations: string[];
  apps: string[];
  user_id?: string;
  contextual?: boolean;
  app?: string;
}
