export default interface Session {
  user_id: string;
  expires_at: string;
  original_session_id?: string;
  device_name?: string;
  browser_name?: string;
  device_type?: string;
}
