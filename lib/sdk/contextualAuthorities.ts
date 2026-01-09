/**
 * Contextual Authority Manager
 *
 * Provides methods for managing contextual authorities - permissions that can be
 * granted to specific users, authorities, or password-protected resources.
 */

import ContextualAuthority from "@/lib/database/types/contextualAuthority";

export interface CreateContextualAuthorityParams {
  id: string;
  permission: string;
  user?: string;
  authority?: string;
  password?: string;
}

export interface DeleteContextualAuthorityParams {
  id: string;
  user?: string;
  authority?: string;
  passwordTimestamp?: number;
}

export interface ContextualAuthorityManagerOptions {
  appId: string;
}

/**
 * Contextual Authority Manager for managing resource-level permissions
 */
export class ContextualAuthorityManager {
  private appId: string;

  constructor(options: ContextualAuthorityManagerOptions) {
    this.appId = options.appId;
  }

  /**
   * Create a new contextual authority
   * @param params Parameters for creating the contextual authority
   * @returns The created contextual authority
   *
   * @example
   * ```typescript
   * // Grant user-specific access
   * await manager.create({
   *   id: 'file-123',
   *   permission: 'files:view',
   *   user: 'user-456'
   * });
   *
   * // Grant authority-based access
   * await manager.create({
   *   id: 'file-123',
   *   permission: 'files:edit',
   *   authority: 'admin'
   * });
   *
   * // Grant password-protected access
   * await manager.create({
   *   id: 'file-123',
   *   permission: 'files:view',
   *   password: 'secret123'
   * });
   * ```
   */
  async create(
    params: CreateContextualAuthorityParams
  ): Promise<ContextualAuthority> {
    const response = await fetch(
      "/api/system/model/contextual-authorities/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          app: this.appId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create contextual authority");
    }

    const data = await response.json();
    return data.contextualAuthority;
  }

  /**
   * Delete a contextual authority
   * @param params Parameters for deleting the contextual authority
   * @returns True if deleted successfully
   *
   * @example
   * ```typescript
   * // Delete user-specific access
   * await manager.delete({
   *   id: 'file-123',
   *   user: 'user-456'
   * });
   *
   * // Delete authority-based access
   * await manager.delete({
   *   id: 'file-123',
   *   authority: 'admin'
   * });
   *
   * // Delete password-protected access
   * await manager.delete({
   *   id: 'file-123',
   *   passwordTimestamp: 1234567890
   * });
   * ```
   */
  async delete(params: DeleteContextualAuthorityParams): Promise<boolean> {
    const response = await fetch(
      "/api/system/model/contextual-authorities/delete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          app: this.appId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete contextual authority");
    }

    const data = await response.json();
    return data.success;
  }

  /**
   * List all contextual authorities for a resource
   * @param resourceId The ID of the resource
   * @returns Array of contextual authorities
   *
   * @example
   * ```typescript
   * const authorities = await manager.list('file-123');
   * console.log(authorities); // All contextual authorities for file-123
   * ```
   */
  async list(resourceId: string): Promise<ContextualAuthority[]> {
    const response = await fetch(
      "/api/system/model/contextual-authorities/list",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app: this.appId,
          id: resourceId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error || "Failed to fetch contextual authorities"
      );
    }

    const data = await response.json();
    return data.authorities;
  }
}

/**
 * Create a contextual authority manager instance
 * @param appId The ID of the app
 * @returns A contextual authority manager instance
 *
 * @example
 * ```typescript
 * const manager = createContextualAuthorityManager('my-app');
 *
 * // Create a contextual authority
 * await manager.create({
 *   id: 'resource-123',
 *   permission: 'my-app:view',
 *   user: 'user-456'
 * });
 *
 * // List authorities for a resource
 * const authorities = await manager.list('resource-123');
 *
 * // Delete a contextual authority
 * await manager.delete({
 *   id: 'resource-123',
 *   user: 'user-456'
 * });
 * ```
 */
export function createContextualAuthorityManager(
  appId: string
): ContextualAuthorityManager {
  return new ContextualAuthorityManager({ appId });
}
