"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemInterface = void 0;
exports.createSystemInterface = createSystemInterface;
const db_1 = require("./db");
/**
 * SystemInterface provides apps with access to system data (apps, users, authorities, authorizations)
 * This allows apps to dynamically work with system permissions and create their own custom permissions
 */
class SystemInterface {
    constructor(options) {
        this.appId = options.appId;
        this.requestingUserId = options.requestingUserId;
    }
    /**
     * Get a list of all apps in the system
     * @returns Array of all apps
     */
    async getApps() {
        const apps = await (0, db_1.getAllApps)();
        return apps.sort((a, b) => a.label.localeCompare(b.label));
    }
    /**
     * Get a specific app by ID
     * @param appId The ID of the app to retrieve
     * @returns The app if found, null otherwise
     */
    async getApp(appId) {
        return await (0, db_1.getApp)(appId);
    }
    /**
     * Get a list of all users in the system (without password hashes)
     * @param includeInactive Whether to include inactive users (default: false)
     * @returns Array of all users with their authority names
     */
    async getUsers(includeInactive = false) {
        const users = await (0, db_1.getAllUsers)();
        const authorities = await (0, db_1.getAllAuthorities)();
        const authorityMap = new Map(authorities.map((a) => [a.id, a.name]));
        const filteredUsers = includeInactive
            ? users
            : users.filter((u) => u.isActive);
        return filteredUsers
            .map((user) => {
            const { passwordHash } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
            return Object.assign(Object.assign({}, userWithoutPassword), { authorityName: authorityMap.get(user.authority) });
        })
            .sort((a, b) => a.username.localeCompare(b.username));
    }
    /**
     * Get a specific user by ID (without password hash)
     * @param userId The ID of the user to retrieve
     * @returns The user if found, null otherwise
     */
    async getUser(userId) {
        const user = await (0, db_1.getUserById)(userId);
        if (!user) {
            return null;
        }
        const authority = await (0, db_1.getAuthority)(user.authority);
        const { passwordHash } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
        return Object.assign(Object.assign({}, userWithoutPassword), { authorityName: authority === null || authority === void 0 ? void 0 : authority.name });
    }
    /**
     * Get a list of all authorities in the system
     * @returns Array of all authorities
     */
    async getAuthorities() {
        const authorities = await (0, db_1.getAllAuthorities)();
        return authorities.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Get a specific authority by ID
     * @param authorityId The ID of the authority to retrieve
     * @returns The authority if found, null otherwise
     */
    async getAuthority(authorityId) {
        return await (0, db_1.getAuthority)(authorityId);
    }
    /**
     * Get a list of all authorizations in the system
     * @param filterByApp Optional app ID to filter authorizations
     * @returns Array of all authorizations with app labels
     */
    async getAuthorizations(filterByApp) {
        const authorizations = await (0, db_1.getAllAuthorizations)();
        const apps = await (0, db_1.getAllApps)();
        const appMap = new Map(apps.map((a) => [a.id, a.label]));
        const filtered = filterByApp
            ? authorizations.filter((a) => a.app === filterByApp)
            : authorizations;
        return filtered
            .map((auth) => (Object.assign(Object.assign({}, auth), { appLabel: appMap.get(auth.app) })))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Get authorizations for the current app only
     * @returns Array of authorizations belonging to this app
     */
    async getMyAuthorizations() {
        return this.getAuthorizations(this.appId);
    }
    /**
     * Get a specific authorization by ID
     * @param authorizationId The ID of the authorization to retrieve
     * @returns The authorization if found, null otherwise
     */
    async getAuthorization(authorizationId) {
        const auth = await (0, db_1.getAuthorization)(authorizationId);
        if (!auth) {
            return null;
        }
        const app = await (0, db_1.getApp)(auth.app);
        return Object.assign(Object.assign({}, auth), { appLabel: app === null || app === void 0 ? void 0 : app.label });
    }
    /**
     * Check if a user has a specific authorization
     * @param userId The ID of the user to check
     * @param authorizationId The ID of the authorization to check
     * @returns True if the user has the authorization, false otherwise
     */
    async checkUserAuthorization(userId, authorizationId) {
        return await (0, db_1.userHasAuthorization)(userId, authorizationId);
    }
    /**
     * Get all authorizations for a specific user
     * @param userId The ID of the user
     * @returns Array of authorization IDs the user has
     */
    async getUserAuthorizationIds(userId) {
        return await (0, db_1.getUserAuthorizations)(userId);
    }
    /**
     * Get all authorization details for a specific user
     * @param userId The ID of the user
     * @returns Array of full authorization objects the user has
     */
    async getUserAuthorizationDetails(userId) {
        const authIds = await (0, db_1.getUserAuthorizations)(userId);
        const allAuths = await this.getAuthorizations();
        return allAuths.filter((auth) => authIds.includes(auth.id));
    }
    /**
     * Check if the requesting user has a specific authorization
     * Requires requestingUserId to be set in the constructor
     * @param authorizationId The ID of the authorization to check
     * @returns True if the requesting user has the authorization, false otherwise
     */
    async checkMyAuthorization(authorizationId) {
        if (!this.requestingUserId) {
            throw new Error('requestingUserId must be set to use checkMyAuthorization');
        }
        return await (0, db_1.userHasAuthorization)(this.requestingUserId, authorizationId);
    }
    /**
     * Get all authorizations for the requesting user
     * Requires requestingUserId to be set in the constructor
     * @returns Array of authorization IDs the requesting user has
     */
    async getMyAuthorizationIds() {
        if (!this.requestingUserId) {
            throw new Error('requestingUserId must be set to use getMyAuthorizationIds');
        }
        return await (0, db_1.getUserAuthorizations)(this.requestingUserId);
    }
    /**
     * Get all authorization details for the requesting user
     * Requires requestingUserId to be set in the constructor
     * @returns Array of full authorization objects the requesting user has
     */
    async getMyAuthorizationDetails() {
        if (!this.requestingUserId) {
            throw new Error('requestingUserId must be set to use getMyAuthorizationDetails');
        }
        return await this.getUserAuthorizationDetails(this.requestingUserId);
    }
    /**
     * Get the requesting user's information
     * Requires requestingUserId to be set in the constructor
     * @returns The requesting user's information
     */
    async getMyUserInfo() {
        if (!this.requestingUserId) {
            throw new Error('requestingUserId must be set to use getMyUserInfo');
        }
        return await this.getUser(this.requestingUserId);
    }
    /**
     * Get statistics about users grouped by authority
     * @returns Map of authority ID to user count
     */
    async getUsersByAuthority() {
        const users = await (0, db_1.getAllUsers)();
        const countMap = new Map();
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
    async getAuthoritiesWithUserCount() {
        const authorities = await (0, db_1.getAllAuthorities)();
        const userCounts = await this.getUsersByAuthority();
        return authorities
            .map((auth) => (Object.assign(Object.assign({}, auth), { userCount: userCounts.get(auth.id) || 0 })))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
}
exports.SystemInterface = SystemInterface;
/**
 * Factory function to create a SystemInterface instance
 * @param appId The ID of the app requesting system data
 * @param requestingUserId Optional ID of the user making the request
 * @returns A SystemInterface instance
 */
function createSystemInterface(appId, requestingUserId) {
    return new SystemInterface({ appId, requestingUserId });
}
