# Plugin SDK Documentation

The Vibe Applicator Plugin SDK provides a comprehensive system for building plugins/apps that integrate seamlessly with the platform. It includes sandboxed record management and system-wide data access.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [RecordManager](#recordmanager)
- [SystemInterface](#systeminterface)
- [Authorization Helpers](#authorization-helpers)
- [Example Plugin](#example-plugin)
- [Best Practices](#best-practices)

## Overview

The Plugin SDK consists of two main components:

1. **RecordManager** - Sandboxed CRUD operations for app-specific data storage
2. **SystemInterface** - Read access to system data (users, apps, authorities, authorizations)

### Key Features

- **Data Sandboxing**: Each app's data is isolated in Redis using key prefixing (`app:{appId}:records:{recordId}`)
- **Permission System**: Integration with the platform's three-tier permission system (Users → Authorities → Authorizations)
- **Type Safety**: Full TypeScript support with generics for custom data types
- **Batch Operations**: Efficient batch create, read, and delete operations
- **REST API Integration**: Apps are expected to integrate with each other via REST APIs

## Quick Start

```typescript
import { createPlugin } from '@/lib/plugin-sdk';

// Create a plugin instance
const plugin = createPlugin('my-app-id', 'user-123');

// Use the record manager for app-specific data
interface MyData {
  name: string;
  email: string;
}

const record = await plugin.records.create<MyData>({
  name: 'John Doe',
  email: 'john@example.com'
});

// Access system data
const users = await plugin.system.getUsers();
const hasPermission = await plugin.system.checkMyAuthorization('admin');
```

## RecordManager

The `RecordManager` provides sandboxed CRUD operations for app-specific records. All records are automatically prefixed with `app:{appId}:records:` to ensure data isolation.

### Creating a Record Manager

```typescript
import { createRecordManager } from '@/lib/plugin-sdk';

const records = createRecordManager<MyDataType>('my-app-id');
```

### Record Structure

All records automatically include metadata:

```typescript
interface Record<T> {
  id: string;          // Unique identifier (UUID or custom)
  data: T;             // Your custom data
  createdAt: string;   // ISO 8601 timestamp
  updatedAt: string;   // ISO 8601 timestamp
}
```

### Methods

#### `create(data, customId?)`

Create a new record.

```typescript
const record = await records.create({ name: 'John', age: 30 });

// With custom ID
const record = await records.create({ name: 'Jane' }, 'custom-id-123');
```

#### `read(recordId)`

Read a record by ID.

```typescript
const record = await records.read('record-id');
if (!record) {
  console.log('Record not found');
}
```

#### `update(recordId, data, replace?)`

Update a record by ID. By default, merges with existing data.

```typescript
// Merge update (default)
await records.update('record-id', { age: 31 });

// Replace entire data object
await records.update('record-id', { name: 'Jane', age: 25 }, true);
```

#### `delete(recordId)`

Delete a record by ID.

```typescript
const deleted = await records.delete('record-id');
console.log(deleted ? 'Deleted' : 'Not found');
```

#### `list(options?)`

List all records with pagination and filtering.

```typescript
// Get all records
const result = await records.list();

// With pagination
const result = await records.list({ limit: 10, offset: 0 });

// With pattern filtering
const result = await records.list({ pattern: 'user-*' });

// Result structure
interface ListRecordsResult<T> {
  records: Record<T>[];
  total: number;
  limit: number;
  offset: number;
}
```

#### `exists(recordId)`

Check if a record exists.

```typescript
const exists = await records.exists('record-id');
```

#### `count(pattern?)`

Count all records, optionally with pattern filtering.

```typescript
const total = await records.count();
const userRecords = await records.count('user-*');
```

#### `deleteAll()`

Delete all records for the app (use with caution!).

```typescript
const deletedCount = await records.deleteAll();
```

### Batch Operations

#### `batchCreate(dataArray)`

Create multiple records in a single operation.

```typescript
const records = await records.batchCreate([
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 },
  { name: 'Bob', age: 35 }
]);
```

#### `batchRead(recordIds)`

Read multiple records by IDs.

```typescript
const records = await records.batchRead(['id-1', 'id-2', 'id-3']);
// Returns array with null for non-existent records
```

#### `batchDelete(recordIds)`

Delete multiple records by IDs.

```typescript
const deletedCount = await records.batchDelete(['id-1', 'id-2', 'id-3']);
```

## SystemInterface

The `SystemInterface` provides read access to system-wide data, allowing plugins to integrate with the platform's permission system and user management.

### Creating a System Interface

```typescript
import { createSystemInterface } from '@/lib/plugin-sdk';

// Without user context
const system = createSystemInterface('my-app-id');

// With user context (enables user-specific methods)
const system = createSystemInterface('my-app-id', 'user-123');
```

### Apps

#### `getApps()`

Get all apps in the system.

```typescript
const apps = await system.getApps();
// Returns: App[] sorted by label
```

#### `getApp(appId)`

Get a specific app by ID.

```typescript
const app = await system.getApp('my-app-id');
```

### Users

#### `getUsers(includeInactive?)`

Get all users (without password hashes).

```typescript
// Active users only (default)
const users = await system.getUsers();

// Include inactive users
const allUsers = await system.getUsers(true);

// Returns: UserWithAuthority[] sorted by username
```

#### `getUser(userId)`

Get a specific user by ID.

```typescript
const user = await system.getUser('user-123');
// Returns: UserWithAuthority | null
```

### Authorities

#### `getAuthorities()`

Get all authorities.

```typescript
const authorities = await system.getAuthorities();
// Returns: Authority[] sorted by name
```

#### `getAuthority(authorityId)`

Get a specific authority by ID.

```typescript
const authority = await system.getAuthority('admin');
```

#### `getAuthoritiesWithUserCount()`

Get authorities with user count information.

```typescript
const authorities = await system.getAuthoritiesWithUserCount();
// Returns: AuthorityWithDetails[] with userCount property
```

### Authorizations

#### `getAuthorizations(filterByApp?)`

Get all authorizations, optionally filtered by app.

```typescript
// All authorizations
const authorizations = await system.getAuthorizations();

// Authorizations for a specific app
const appAuths = await system.getAuthorizations('my-app-id');

// Returns: AuthorizationWithApp[] sorted by name
```

#### `getMyAuthorizations()`

Get authorizations for the current app only.

```typescript
const myAuths = await system.getMyAuthorizations();
```

#### `getAuthorization(authorizationId)`

Get a specific authorization by ID.

```typescript
const auth = await system.getAuthorization('admin');
```

### Permission Checking

#### `checkUserAuthorization(userId, authorizationId)`

Check if a user has a specific authorization.

```typescript
const hasPermission = await system.checkUserAuthorization(
  'user-123',
  'admin'
);
```

#### `getUserAuthorizationIds(userId)`

Get all authorization IDs for a user.

```typescript
const authIds = await system.getUserAuthorizationIds('user-123');
// Returns: string[]
```

#### `getUserAuthorizationDetails(userId)`

Get all authorization details for a user.

```typescript
const auths = await system.getUserAuthorizationDetails('user-123');
// Returns: AuthorizationWithApp[]
```

### User-Specific Methods

These methods require `requestingUserId` to be set in the constructor.

#### `checkMyAuthorization(authorizationId)`

Check if the requesting user has a specific authorization.

```typescript
const hasPermission = await system.checkMyAuthorization('admin');
```

#### `getMyAuthorizationIds()`

Get all authorization IDs for the requesting user.

```typescript
const authIds = await system.getMyAuthorizationIds();
```

#### `getMyAuthorizationDetails()`

Get all authorization details for the requesting user.

```typescript
const auths = await system.getMyAuthorizationDetails();
```

#### `getMyUserInfo()`

Get the requesting user's information.

```typescript
const me = await system.getMyUserInfo();
```

### Statistics

#### `getUsersByAuthority()`

Get user count grouped by authority.

```typescript
const stats = await system.getUsersByAuthority();
// Returns: Map<string, number>
```

## Authorization Helpers

The SDK provides helper functions for checking permissions.

### `requireAuthorization(plugin, authorizationId)`

Require a user to have at least one of the specified authorizations. Throws an error if not authorized.

```typescript
import { requireAuthorization } from '@/lib/plugin-sdk';

// Require a single authorization
await requireAuthorization(plugin, 'admin');

// Require at least one of multiple authorizations
await requireAuthorization(plugin, ['admin', 'developer']);
```

### `requireAllAuthorizations(plugin, authorizationIds)`

Require a user to have all specified authorizations. Throws an error if any are missing.

```typescript
import { requireAllAuthorizations } from '@/lib/plugin-sdk';

await requireAllAuthorizations(plugin, ['admin', 'developer']);
```

## Example Plugin

See `lib/examples/example-plugin.ts` for a complete task management plugin that demonstrates:

- Creating custom authorizations
- Using RecordManager for task storage
- Implementing permission-based access control
- Validating user assignments
- Providing statistics and filtering

### Key Example Code

```typescript
import { createPlugin, requireAuthorization } from '@/lib/plugin-sdk';

const plugin = createPlugin('task-manager', userId);

// Create a task with permission check
async function createTask(taskData) {
  await requireAuthorization(plugin, 'task-manager:manage-tasks');

  // Validate assignee
  if (taskData.assignedTo) {
    const user = await plugin.system.getUser(taskData.assignedTo);
    if (!user) {
      throw new Error('User not found');
    }
  }

  await plugin.records.create(taskData);
}

// Get tasks with permission-based filtering
async function getTasks() {
  const canViewAll = await plugin.system.checkMyAuthorization(
    'task-manager:view-all-tasks'
  );

  const result = await plugin.records.list();

  // Filter based on permissions
  return result.records.filter(record => {
    if (canViewAll) return true;
    return record.data.createdBy === userId ||
           record.data.assignedTo === userId;
  });
}
```

## Best Practices

### 1. Use Custom Authorizations

Create app-specific authorizations for fine-grained permission control:

```typescript
await createAuthorization(
  'my-app:manage-data',
  'Manage Data',
  'Can create, edit, and delete data records',
  'my-app-id'
);
```

### 2. Validate User Input

Always validate user IDs, especially when assigning or referencing users:

```typescript
if (taskData.assignedTo) {
  const user = await plugin.system.getUser(taskData.assignedTo);
  if (!user) {
    throw new Error('Assigned user does not exist');
  }
}
```

### 3. Use Permission Checks

Always check permissions before performing sensitive operations:

```typescript
await requireAuthorization(plugin, 'my-app:admin');
// Proceed with admin operation
```

### 4. Batch Operations for Performance

Use batch operations when working with multiple records:

```typescript
// Good
const records = await plugin.records.batchCreate(dataArray);

// Avoid
for (const data of dataArray) {
  await plugin.records.create(data);
}
```

### 5. Type Safety

Use TypeScript generics for type-safe record management:

```typescript
interface Task {
  title: string;
  status: 'pending' | 'completed';
}

const plugin = createPlugin<Task>('my-app', userId);
// TypeScript will enforce Task structure
```

### 6. Error Handling

Always handle errors appropriately:

```typescript
try {
  await plugin.records.create(data);
} catch (error) {
  if (error.message.includes('authorization')) {
    // Handle permission error
  } else {
    // Handle other errors
  }
}
```

### 7. Data Isolation

Remember that records are automatically sandboxed per app. You cannot access another app's records:

```typescript
// Your app's records: app:my-app:records:*
// Other app's records: app:other-app:records:* (inaccessible)
```

### 8. REST API Integration

Apps should integrate with each other via REST APIs, not by directly accessing each other's data:

```typescript
// Good: Create API endpoints for your app
app.get('/api/my-app/tasks', async (req, res) => {
  const plugin = createPlugin('my-app', req.userId);
  const tasks = await plugin.records.list();
  res.json(tasks);
});

// Avoid: Trying to access another app's data directly
```

## Data Structure Reference

### Record<T>

```typescript
interface Record<T> {
  id: string;
  data: T;
  createdAt: string;
  updatedAt: string;
}
```

### App

```typescript
interface App {
  id: string;
  label: string;
  version: string;
  author: string;
  contactEmail: string;
  description: string;
}
```

### User (with Authority)

```typescript
interface UserWithAuthority {
  id: string;
  username: string;
  email: string;
  displayName: string;
  authority: string;
  isActive: boolean;
  profilePicture?: string;
  createdAt: string;
  authorityName?: string;
  // passwordHash is excluded for security
}
```

### Authority

```typescript
interface Authority {
  id: string;
  name: string;
  icon?: string;
  authorizations: string[];
}
```

### Authorization (with App)

```typescript
interface AuthorizationWithApp {
  id: string;
  name: string;
  description: string;
  app: string;
  appLabel?: string;
}
```

## License

This SDK is part of the Vibe Applicator platform.
