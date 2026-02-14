export default interface ContextualAuthority {
  permission: string;
  user?: string;
  authority?: string;
  password?: string;
  app: string;
  created_at: number;
  created_by: string;
  context?: string;
}
