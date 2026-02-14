export default interface User {
  username: string;
  email: string;
  display_name: string;
  password_hash: string;
  authority_id: string;
  is_active: boolean;
  icon?: string; // Path to user's profile picture
}
