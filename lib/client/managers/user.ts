import CRUD from "@/lib/client/database/crud/";
import User from "@/lib/database/types/user";

export default class Manager extends CRUD<User> {
  tableId = "users";
  appId = "system";
}

export async function getCurrentUser(): Promise<{
  user: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    authority: string;
    isAdmin: boolean;
    profilePicture: string;
  };
  authorizations: string[];
  userSubApps: string[];
  userMainApps: string[];
  isAssumedIdentity: boolean;
}> {
  const response = await fetch("/api/system/settings/user");

  if (!response.ok) {
    throw new Error(
      `Error fetching current user: [${response.status}] ${
        (await response.json()).error
      }`
    );
  }

  return await response.json();
}
