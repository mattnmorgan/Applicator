/**
 * Database module - Centralized database operations
 *
 * This module provides all database operations organized by entity type.
 * Each sub-module handles CRUD operations for a specific entity.
 */

// Export version utility functions
export {
  formatVersion,
  parseVersion,
  compareVersions,
  isVersionGreaterOrEqual,
} from "./utils";

// Export types
export type {
  AppVersion,
  ApiRoute,
  Widget,
  default as App,
} from "@/lib/database/types/app";
export type { default as Authority } from "@/lib/database/types/authority";
export type { default as Authorization } from "@/lib/database/types/authorization";
export type { default as ContextualAuthority } from "@/lib/database/types/contextualAuthority";
export type { default as User } from "@/lib/database/types/user";
export type { default as Session } from "@/lib/database/types/session";
export type { FieldType, default as TableField } from "@/lib/database/types/field";
export type { default as TableDefinition } from "@/lib/database/types/tableDefinition";
export type { default as TableRecord } from "@/lib/database/types/tableRecord";

// Export authorization functions
export {
  createAuthorization,
  getAuthorization,
  getAllAuthorizations,
  updateAuthorization,
  deleteAuthorization,
} from "./authorization";

// Export authority functions
export {
  createAuthority,
  getAuthority,
  initializeAuthorities,
  getAllAuthorities,
  updateAuthority,
  deleteAuthority,
  getUserCountByAuthority,
  createOrUpdateUserAuthority,
  getUserAuthority,
  deleteUserAuthority,
} from "./authority";

// Export app functions
export {
  createApp,
  getApp,
  getAllApps,
  updateApp,
  deleteApp,
  parseSubAppId,
  getSubApp,
  getUserSubApps,
  getUserMainApps,
  getAllWidgetsForApp,
} from "./app";

// Export user functions
export {
  createUser,
  getUserById,
  getUserByUsername,
  verifyPassword,
  getAllUsers,
  updateUserStatus,
  updateUser,
  userHasAuthorization,
  getUserAuthorizations,
  getUserAppAccess,
} from "./user";

// Export session functions
export {
  createSession,
  getSession,
  deleteSession,
} from "./session";

// Export system functions
export {
  getSystemSetting,
  setSystemSetting,
  isFirstTimeSetup,
} from "./system";

// Export contextual authority functions
export {
  createContextualAuthority,
  getContextualAuthoritiesByResourceId,
  deleteContextualAuthority,
  deleteContextualAuthoritiesByApp,
  getContextualAuthoritiesByUser,
  getContextualAuthoritiesByAuthority,
} from "./contextualAuthority";
