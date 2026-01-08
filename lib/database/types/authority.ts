export default interface Authority {
  id: string;
  name: string;
  icon?: string;
  /**
   * List of authorizations the authority grants access to
   */
  authorizations: string[];
  /**
   * List of app identifiers the authority grants access to
   */
  apps: string[];
  /**
   * User identifier this authority is associated with
   */
  userId?: string;
  /**
   * If true, this authority is contextual and cannot be assigned to users
   * Contextual authorities are created by apps and should not be editable or deletable
   */
  contextual?: boolean;
  /**
   * App that created this authority (only set if contextual is true)
   */
  app?: string;
}
