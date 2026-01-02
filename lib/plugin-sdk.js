"use strict";
/**
 * Plugin SDK for Vibe Applicator
 *
 * This module provides the complete SDK for building plugins/apps that integrate
 * with the Vibe Applicator system. It includes:
 *
 * 1. RecordManager - Sandboxed CRUD operations for app-specific data
 * 2. SystemInterface - Access to system data (users, apps, authorities, authorizations)
 *
 * @example
 * ```typescript
 * import { createPlugin } from '@/lib/plugin-sdk';
 *
 * const plugin = createPlugin('my-app-id', 'user-123');
 *
 * // Use the record manager for app-specific data
 * await plugin.records.create({ name: 'John', email: 'john@example.com' });
 *
 * // Access system data
 * const users = await plugin.system.getUsers();
 * const hasPermission = await plugin.system.checkMyAuthorization('admin');
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemInterface = exports.SystemInterface = exports.createRecordManager = exports.RecordManager = void 0;
exports.createPlugin = createPlugin;
exports.requireAuthorization = requireAuthorization;
exports.requireAllAuthorizations = requireAllAuthorizations;
var records_1 = require("./records");
Object.defineProperty(exports, "RecordManager", { enumerable: true, get: function () { return records_1.RecordManager; } });
Object.defineProperty(exports, "createRecordManager", { enumerable: true, get: function () { return records_1.createRecordManager; } });
var system_1 = require("./system");
Object.defineProperty(exports, "SystemInterface", { enumerable: true, get: function () { return system_1.SystemInterface; } });
Object.defineProperty(exports, "createSystemInterface", { enumerable: true, get: function () { return system_1.createSystemInterface; } });
const records_2 = require("./records");
const system_2 = require("./system");
/**
 * Create a complete plugin instance with both record management and system interface
 * @param appId The ID of the app/plugin
 * @param userId Optional ID of the user making the request (required for user-specific methods)
 * @returns A plugin instance with records and system interfaces
 *
 * @example
 * ```typescript
 * // Create a plugin instance
 * const plugin = createPlugin('my-app', 'user-123');
 *
 * // Use record manager
 * const record = await plugin.records.create({ foo: 'bar' });
 * const allRecords = await plugin.records.list();
 *
 * // Use system interface
 * const users = await plugin.system.getUsers();
 * const myPerms = await plugin.system.getMyAuthorizationDetails();
 * ```
 */
function createPlugin(appId, userId) {
    return {
        appId,
        userId,
        records: (0, records_2.createRecordManager)(appId),
        system: (0, system_2.createSystemInterface)(appId, userId),
    };
}
/**
 * Helper function to check if a user has required authorization(s)
 * Throws an error if the user doesn't have the required authorization
 *
 * @param plugin The plugin instance
 * @param authorizationId Single authorization ID or array of IDs (user must have at least one)
 * @throws Error if user doesn't have the required authorization
 *
 * @example
 * ```typescript
 * const plugin = createPlugin('my-app', userId);
 *
 * // Require admin authorization
 * await requireAuthorization(plugin, 'admin');
 *
 * // Require at least one of multiple authorizations
 * await requireAuthorization(plugin, ['admin', 'developer']);
 * ```
 */
async function requireAuthorization(plugin, authorizationId) {
    if (!plugin.userId) {
        throw new Error('User ID is required to check authorization');
    }
    const authIds = Array.isArray(authorizationId)
        ? authorizationId
        : [authorizationId];
    const hasAny = await Promise.all(authIds.map((id) => plugin.system.checkUserAuthorization(plugin.userId, id)));
    if (!hasAny.some((has) => has)) {
        const authNames = authIds.join(' or ');
        throw new Error(`User does not have required authorization: ${authNames}`);
    }
}
/**
 * Helper function to check if a user has all required authorizations
 * Throws an error if the user doesn't have all the required authorizations
 *
 * @param plugin The plugin instance
 * @param authorizationIds Array of authorization IDs (user must have all)
 * @throws Error if user doesn't have all the required authorizations
 *
 * @example
 * ```typescript
 * const plugin = createPlugin('my-app', userId);
 *
 * // Require both admin and developer authorizations
 * await requireAllAuthorizations(plugin, ['admin', 'developer']);
 * ```
 */
async function requireAllAuthorizations(plugin, authorizationIds) {
    if (!plugin.userId) {
        throw new Error('User ID is required to check authorization');
    }
    const hasAll = await Promise.all(authorizationIds.map((id) => plugin.system.checkUserAuthorization(plugin.userId, id)));
    if (!hasAll.every((has) => has)) {
        const missingAuths = authorizationIds.filter((_, i) => !hasAll[i]);
        throw new Error(`User is missing required authorizations: ${missingAuths.join(', ')}`);
    }
}
