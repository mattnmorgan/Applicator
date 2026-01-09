export default interface ContextualAuthority {
  /**
   * Identifier that the authority applies to (e.g., file ID, resource ID)
   */
  id: string;
  /**
   * ID of a contextual authorization specifying permissions the authority grants
   */
  permission: string;
  /**
   * User ID to which the contextual authority applies (if user-based)
   */
  user?: string;
  /**
   * Authority ID to which the contextual authority applies (if authority-based)
   */
  authority?: string;
  /**
   * Hashed password for password-protected access (if password-based)
   */
  password?: string;
  /**
   * App that created this contextual authority
   */
  app: string;
  /**
   * Timestamp when the contextual authority was created
   */
  createdAt: number;
  /**
   * User ID or app identifier that created this authority
   */
  createdBy: string;
}
