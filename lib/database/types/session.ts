export default interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  /**
   * Reference to original session for assumed identities
   */
  originalSessionId?: string;
}
