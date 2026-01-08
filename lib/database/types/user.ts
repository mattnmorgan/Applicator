export default interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authority: string;
  isActive: boolean;
  createdAt: string;
  profilePicture?: string;
}
