export default interface User {
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authority: string;
  isActive: boolean;
  profilePicture?: string;
}
