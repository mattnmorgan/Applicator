import {
  getAllApps,
  getAllUsers,
  getAllAuthorities,
  getAllAuthorizations,
  getUserById,
  getAuthority,
  getAuthorization,
  getApp,
  userHasAuthorization,
  getUserAuthorizations,
  type App,
  type User,
  type Authority,
  type Authorization,
} from './db';

export interface UserWithAuthority extends Omit<User, 'passwordHash'> {
  authorityName?: string;
}

export interface AuthorityWithDetails extends Authority {
  userCount?: number;
}

export interface AuthorizationWithApp extends Authorization {
  appLabel?: string;
}

export interface SystemInterfaceOptions {
  appId: string;
  requestingUserId?: string;
}

/**
 * SystemInterface provides apps with access to system data (apps, users, authorities, authorizations)
 * This allows apps to dynamically work with system permissions and create their own custom permissions
 */
export class SystemInterface {
  private appId: string;
  private requestingUserId?: string;

  constructor(options: SystemInterfaceOptions) {
    this.appId = options.appId;
    this.requestingUserId = options.requestingUserId;
  }

  /**
   * Get a list of all apps in the system
   * @returns Array of all apps
   */
  async getApps(): Promise<App[]> {
    const apps = await getAllApps();
    return apps.sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Get a specific app by ID
   * @param appId The ID of the app to retrieve
   * @returns The app if found, null otherwise
   */
  async getApp(appId: string): Promise<App | null> {
    return await getApp(appId);
  }

  /**
   * Get a list of all users in the system (without password hashes)
   * @param includeInactive Whether to include inactive users (default: false)
   * @returns Array of all users with their authority names
   */
  async getUsers(includeInactive: boolean = false): Promise<UserWithAuthority[]> {
    const users = await getAllUsers();
    const authorities = await getAllAuthorities();
    const authorityMap = new Map(authorities.map((a) => [a.id, a.name]));

    const filteredUsers = includeInactive
      ? users
      : users.filter((u) => u.isActive);

    return filteredUsers
      .map((user) => {
        const { passwordHash, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          authorityName: authorityMap.get(user.authority),
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  /**
   * Get a specific user by ID (without password hash)
   * @param userId The ID of the user to retrieve
   * @returns The user if found, null otherwise
   */
  async getUser(userId: string): Promise<UserWithAuthority | null> {
    const user = await getUserById(userId);
    if (!user) {
      return null;
    }

    const authority = await getAuthority(user.authority);
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      authorityName: authority?.name,
    };
  }

  /**
   * Get a list of all authorities in the system
   * @returns Array of all authorities
   */
  async getAuthorities(): Promise<Authority[]> {
    const authorities = await getAllAuthorities();
    return authorities.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get a specific authority by ID
   * @param authorityId The ID of the authority to retrieve
   * @returns The authority if found, null otherwise
   */
  async getAuthority(authorityId: string): Promise<Authority | null> {
    return await getAuthority(authorityId);
  }

  /**
   * Get a list of all authorizations in the system
   * @param filterByApp Optional app ID to filter authorizations
   * @returns Array of all authorizations with app labels
   */
  async getAuthorizations(
    filterByApp?: string
  ): Promise<AuthorizationWithApp[]> {
    const authorizations = await getAllAuthorizations();
    const apps = await getAllApps();
    const appMap = new Map(apps.map((a) => [a.id, a.label]));

    const filtered = filterByApp
      ? authorizations.filter((a) => a.app === filterByApp)
      : authorizations;

    return filtered
      .map((auth) => ({
        ...auth,
        appLabel: appMap.get(auth.app),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get authorizations for the current app only
   * @returns Array of authorizations belonging to this app
   */
  async getMyAuthorizations(): Promise<AuthorizationWithApp[]> {
    return this.getAuthorizations(this.appId);
  }

  /**
   * Get a specific authorization by ID
   * @param authorizationId The ID of the authorization to retrieve
   * @returns The authorization if found, null otherwise
   */
  async getAuthorization(
    authorizationId: string
  ): Promise<AuthorizationWithApp | null> {
    const auth = await getAuthorization(authorizationId);
    if (!auth) {
      return null;
    }

    const app = await getApp(auth.app);
    return {
      ...auth,
      appLabel: app?.label,
    };
  }

  /**
   * Check if a user has a specific authorization
   * @param userId The ID of the user to check
   * @param authorizationId The ID of the authorization to check
   * @returns True if the user has the authorization, false otherwise
   */
  async checkUserAuthorization(
    userId: string,
    authorizationId: string
  ): Promise<boolean> {
    return await userHasAuthorization(userId, authorizationId);
  }

  /**
   * Get all authorizations for a specific user
   * @param userId The ID of the user
   * @returns Array of authorization IDs the user has
   */
  async getUserAuthorizationIds(userId: string): Promise<string[]> {
    return await getUserAuthorizations(userId);
  }

  /**
   * Get all authorization details for a specific user
   * @param userId The ID of the user
   * @returns Array of full authorization objects the user has
   */
  async getUserAuthorizationDetails(
    userId: string
  ): Promise<AuthorizationWithApp[]> {
    const authIds = await getUserAuthorizations(userId);
    const allAuths = await this.getAuthorizations();

    return allAuths.filter((auth) => authIds.includes(auth.id));
  }

  /**
   * Check if the requesting user has a specific authorization
   * Requires requestingUserId to be set in the constructor
   * @param authorizationId The ID of the authorization to check
   * @returns True if the requesting user has the authorization, false otherwise
   */
  async checkMyAuthorization(authorizationId: string): Promise<boolean> {
    if (!this.requestingUserId) {
      throw new Error(
        'requestingUserId must be set to use checkMyAuthorization'
      );
    }
    return await userHasAuthorization(this.requestingUserId, authorizationId);
  }

  /**
   * Get all authorizations for the requesting user
   * Requires requestingUserId to be set in the constructor
   * @returns Array of authorization IDs the requesting user has
   */
  async getMyAuthorizationIds(): Promise<string[]> {
    if (!this.requestingUserId) {
      throw new Error(
        'requestingUserId must be set to use getMyAuthorizationIds'
      );
    }
    return await getUserAuthorizations(this.requestingUserId);
  }

  /**
   * Get all authorization details for the requesting user
   * Requires requestingUserId to be set in the constructor
   * @returns Array of full authorization objects the requesting user has
   */
  async getMyAuthorizationDetails(): Promise<AuthorizationWithApp[]> {
    if (!this.requestingUserId) {
      throw new Error(
        'requestingUserId must be set to use getMyAuthorizationDetails'
      );
    }
    return await this.getUserAuthorizationDetails(this.requestingUserId);
  }

  /**
   * Get the requesting user's information
   * Requires requestingUserId to be set in the constructor
   * @returns The requesting user's information
   */
  async getMyUserInfo(): Promise<UserWithAuthority | null> {
    if (!this.requestingUserId) {
      throw new Error('requestingUserId must be set to use getMyUserInfo');
    }
    return await this.getUser(this.requestingUserId);
  }

  /**
   * Get statistics about users grouped by authority
   * @returns Map of authority ID to user count
   */
  async getUsersByAuthority(): Promise<Map<string, number>> {
    const users = await getAllUsers();
    const countMap = new Map<string, number>();

    for (const user of users) {
      if (user.isActive) {
        const count = countMap.get(user.authority) || 0;
        countMap.set(user.authority, count + 1);
      }
    }

    return countMap;
  }

  /**
   * Get authorities with user count information
   * @returns Array of authorities with user counts
   */
  async getAuthoritiesWithUserCount(): Promise<AuthorityWithDetails[]> {
    const authorities = await getAllAuthorities();
    const userCounts = await this.getUsersByAuthority();

    return authorities
      .map((auth) => ({
        ...auth,
        userCount: userCounts.get(auth.id) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

/**
 * Factory function to create a SystemInterface instance
 * @param appId The ID of the app requesting system data
 * @param requestingUserId Optional ID of the user making the request
 * @returns A SystemInterface instance
 */
export function createSystemInterface(
  appId: string,
  requestingUserId?: string
): SystemInterface {
  return new SystemInterface({ appId, requestingUserId });
}
