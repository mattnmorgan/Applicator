export default interface ContextualAuthority {
  permission: string;
  user?: string;
  authority?: string;
  password?: string;
  app: string;
}
