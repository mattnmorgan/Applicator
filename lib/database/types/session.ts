export default interface Session {
  user_id: string;
  expires_at: string;
  original_session_id?: string;
}
