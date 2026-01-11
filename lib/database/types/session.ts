export default interface Session {
  userId: string;
  expiresAt: string;
  originalSessionId?: string;
}
