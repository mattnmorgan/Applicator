"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthority = createAuthority;
exports.getAuthority = getAuthority;
exports.initializeAuthorities = initializeAuthorities;
exports.getAllAuthorities = getAllAuthorities;
exports.updateAuthority = updateAuthority;
exports.deleteAuthority = deleteAuthority;
exports.getUserCountByAuthority = getUserCountByAuthority;
exports.createAuthorization = createAuthorization;
exports.getAuthorization = getAuthorization;
exports.getAllAuthorizations = getAllAuthorizations;
exports.updateAuthorization = updateAuthorization;
exports.deleteAuthorization = deleteAuthorization;
exports.createApp = createApp;
exports.getApp = getApp;
exports.getAllApps = getAllApps;
exports.updateApp = updateApp;
exports.deleteApp = deleteApp;
exports.userHasAuthorization = userHasAuthorization;
exports.getUserAuthorizations = getUserAuthorizations;
exports.createUser = createUser;
exports.getUserById = getUserById;
exports.getUserByUsername = getUserByUsername;
exports.verifyPassword = verifyPassword;
exports.getAllUsers = getAllUsers;
exports.updateUserStatus = updateUserStatus;
exports.updateUser = updateUser;
exports.createSession = createSession;
exports.getSession = getSession;
exports.deleteSession = deleteSession;
exports.getSystemSetting = getSystemSetting;
exports.setSystemSetting = setSystemSetting;
exports.isFirstTimeSetup = isFirstTimeSetup;
const redis_1 = require("./redis");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
// Authority management
async function createAuthority(id, name, icon, authorizations = [], apps = []) {
    const redis = (0, redis_1.getRedisClient)();
    const authority = {
        id,
        name,
        icon,
        authorizations,
        apps,
    };
    await redis.set(`authority:${id}`, JSON.stringify(authority));
    return authority;
}
async function getAuthority(id) {
    const redis = (0, redis_1.getRedisClient)();
    const authorityData = await redis.get(`authority:${id}`);
    if (!authorityData) {
        return null;
    }
    return JSON.parse(authorityData);
}
async function initializeAuthorities() {
    const redis = (0, redis_1.getRedisClient)();
    // Check if authorities already exist
    const existingAdmin = await redis.get('authority:admin');
    if (existingAdmin) {
        return; // Authorities already initialized
    }
    // Create the system app
    await createApp('system', 'System', '1.0', 'System', 'system@localhost', 'Core system application');
    // Create default authorizations
    await createAuthorization('admin', 'Administrator', 'Permits administrator access to the system', 'system');
    await createAuthorization('developer', 'Developer', 'Permits developer access to the system', 'system');
    // Create the three default authorities
    // Admin authority has the 'admin' authorization
    await createAuthority('admin', 'Administrator', undefined, ['admin']);
    await createAuthority('user', 'User', undefined, []);
    await createAuthority('guest', 'Guest', undefined, []);
}
async function getAllAuthorities() {
    const redis = (0, redis_1.getRedisClient)();
    const keys = await redis.keys('authority:*');
    const authorities = [];
    for (const key of keys) {
        const authorityData = await redis.get(key);
        if (authorityData) {
            authorities.push(JSON.parse(authorityData));
        }
    }
    return authorities;
}
async function updateAuthority(id, updates) {
    const redis = (0, redis_1.getRedisClient)();
    const authority = await getAuthority(id);
    if (!authority) {
        throw new Error('Authority not found');
    }
    const updatedAuthority = Object.assign(Object.assign({}, authority), updates);
    await redis.set(`authority:${id}`, JSON.stringify(updatedAuthority));
}
async function deleteAuthority(id) {
    const redis = (0, redis_1.getRedisClient)();
    await redis.del(`authority:${id}`);
}
async function getUserCountByAuthority(authorityId) {
    const redis = (0, redis_1.getRedisClient)();
    const users = await getAllUsers();
    return users.filter(user => user.authority === authorityId).length;
}
// Authorization management
async function createAuthorization(id, name, description, app) {
    const redis = (0, redis_1.getRedisClient)();
    const authorization = {
        id,
        name,
        description,
        app,
    };
    await redis.set(`authorization:${id}`, JSON.stringify(authorization));
    return authorization;
}
async function getAuthorization(id) {
    const redis = (0, redis_1.getRedisClient)();
    const authorizationData = await redis.get(`authorization:${id}`);
    if (!authorizationData) {
        return null;
    }
    return JSON.parse(authorizationData);
}
async function getAllAuthorizations() {
    const redis = (0, redis_1.getRedisClient)();
    const keys = await redis.keys('authorization:*');
    const authorizations = [];
    for (const key of keys) {
        const authorizationData = await redis.get(key);
        if (authorizationData) {
            authorizations.push(JSON.parse(authorizationData));
        }
    }
    return authorizations;
}
async function updateAuthorization(id, updates) {
    const redis = (0, redis_1.getRedisClient)();
    const authorization = await getAuthorization(id);
    if (!authorization) {
        throw new Error('Authorization not found');
    }
    const updatedAuthorization = Object.assign(Object.assign({}, authorization), updates);
    await redis.set(`authorization:${id}`, JSON.stringify(updatedAuthorization));
}
async function deleteAuthorization(id) {
    const redis = (0, redis_1.getRedisClient)();
    await redis.del(`authorization:${id}`);
}
// App management
async function createApp(id, label, version, author, contactEmail, description, apiRoutes = []) {
    const redis = (0, redis_1.getRedisClient)();
    const app = {
        id,
        label,
        version,
        author,
        contactEmail,
        description,
        apiRoutes,
    };
    await redis.set(`app:${id}`, JSON.stringify(app));
    return app;
}
async function getApp(id) {
    const redis = (0, redis_1.getRedisClient)();
    const appData = await redis.get(`app:${id}`);
    if (!appData) {
        return null;
    }
    return JSON.parse(appData);
}
async function getAllApps() {
    const redis = (0, redis_1.getRedisClient)();
    const keys = await redis.keys('app:*');
    const apps = [];
    for (const key of keys) {
        const appData = await redis.get(key);
        if (appData) {
            apps.push(JSON.parse(appData));
        }
    }
    return apps;
}
async function updateApp(id, updates) {
    const redis = (0, redis_1.getRedisClient)();
    const app = await getApp(id);
    if (!app) {
        throw new Error('App not found');
    }
    const updatedApp = Object.assign(Object.assign({}, app), updates);
    await redis.set(`app:${id}`, JSON.stringify(updatedApp));
}
async function deleteApp(id) {
    const redis = (0, redis_1.getRedisClient)();
    await redis.del(`app:${id}`);
}
// Helper function to check if a user has a specific authorization
async function userHasAuthorization(userId, authorizationId) {
    const user = await getUserById(userId);
    if (!user) {
        return false;
    }
    const authority = await getAuthority(user.authority);
    if (!authority) {
        return false;
    }
    return authority.authorizations.includes(authorizationId);
}
// Helper function to get all authorizations for a user
async function getUserAuthorizations(userId) {
    const user = await getUserById(userId);
    if (!user) {
        return [];
    }
    const authority = await getAuthority(user.authority);
    if (!authority) {
        return [];
    }
    return authority.authorizations;
}
// User management
async function createUser(username, email, displayName, password, authority = 'user') {
    const redis = (0, redis_1.getRedisClient)();
    const userId = (0, uuid_1.v4)();
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = {
        id: userId,
        username,
        email,
        displayName,
        passwordHash,
        authority,
        isActive: true,
        createdAt: new Date().toISOString(),
    };
    // Store user data
    await redis.set(`user:${userId}`, JSON.stringify(user));
    // Create username -> userId mapping for login
    await redis.set(`user:username:${username}`, userId);
    return user;
}
async function getUserById(userId) {
    const redis = (0, redis_1.getRedisClient)();
    const userData = await redis.get(`user:${userId}`);
    if (!userData) {
        return null;
    }
    return JSON.parse(userData);
}
async function getUserByUsername(username) {
    const redis = (0, redis_1.getRedisClient)();
    const userId = await redis.get(`user:username:${username}`);
    if (!userId) {
        return null;
    }
    return getUserById(userId);
}
async function verifyPassword(password, passwordHash) {
    return bcryptjs_1.default.compare(password, passwordHash);
}
async function getAllUsers() {
    const redis = (0, redis_1.getRedisClient)();
    const keys = await redis.keys('user:*');
    // Filter out username mapping keys
    const userKeys = keys.filter(key => !key.includes('user:username:'));
    const users = [];
    for (const key of userKeys) {
        const userData = await redis.get(key);
        if (userData) {
            users.push(JSON.parse(userData));
        }
    }
    return users;
}
async function updateUserStatus(userId, isActive) {
    const redis = (0, redis_1.getRedisClient)();
    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    user.isActive = isActive;
    await redis.set(`user:${userId}`, JSON.stringify(user));
}
async function updateUser(userId, updates) {
    const redis = (0, redis_1.getRedisClient)();
    const user = await getUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    const updatedUser = Object.assign(Object.assign({}, user), updates);
    await redis.set(`user:${userId}`, JSON.stringify(updatedUser));
}
// Session management
async function createSession(userId) {
    const redis = (0, redis_1.getRedisClient)();
    const sessionId = (0, uuid_1.v4)();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
    const session = {
        id: sessionId,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
    };
    // Store session with expiry
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(session));
    return session;
}
async function getSession(sessionId) {
    const redis = (0, redis_1.getRedisClient)();
    const sessionData = await redis.get(`session:${sessionId}`);
    if (!sessionData) {
        return null;
    }
    const session = JSON.parse(sessionData);
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
        await deleteSession(sessionId);
        return null;
    }
    return session;
}
async function deleteSession(sessionId) {
    const redis = (0, redis_1.getRedisClient)();
    await redis.del(`session:${sessionId}`);
}
// System settings
async function getSystemSetting(key) {
    const redis = (0, redis_1.getRedisClient)();
    return redis.get(`settings:system:${key}`);
}
async function setSystemSetting(key, value) {
    const redis = (0, redis_1.getRedisClient)();
    await redis.set(`settings:system:${key}`, value);
}
async function isFirstTimeSetup() {
    const adminUserId = await getSystemSetting('administratorUserId');
    return adminUserId === null;
}
