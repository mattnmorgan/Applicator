export default interface ContextualAuthority {
  permission: string;
  user?: string;
  authority?: string;
  password?: string;
  app: string;
  createdAt: number;
  createdBy: string;
  context?: string;
}
