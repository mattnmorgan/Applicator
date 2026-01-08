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
}
