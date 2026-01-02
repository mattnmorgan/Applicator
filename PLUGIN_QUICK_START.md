# Plugin SDK Quick Start Guide

Get started building plugins for Vibe Applicator in minutes.

## Installation

The Plugin SDK is built into the platform. Simply import it in your code:

```typescript
import { createPlugin } from '@/lib/plugin-sdk';
```

## Basic Usage

### 1. Create a Plugin Instance

```typescript
const plugin = createPlugin('my-app-id', 'user-id');
```

### 2. Store Data (RecordManager)

```typescript
// Define your data type
interface MyData {
  name: string;
  email: string;
}

// Create a record
const record = await plugin.records.create<MyData>({
  name: 'John Doe',
  email: 'john@example.com'
});

// Read a record
const data = await plugin.records.read(record.id);

// Update a record
await plugin.records.update(record.id, { email: 'newemail@example.com' });

// Delete a record
await plugin.records.delete(record.id);

// List all records
const { records, total } = await plugin.records.list({ limit: 10, offset: 0 });
```

### 3. Access System Data (SystemInterface)

```typescript
// Get all users
const users = await plugin.system.getUsers();

// Get all apps
const apps = await plugin.system.getApps();

// Get authorities
const authorities = await plugin.system.getAuthorities();

// Get authorizations (permissions)
const authorizations = await plugin.system.getAuthorizations();

// Check if user has permission
const hasAdmin = await plugin.system.checkUserAuthorization('user-id', 'admin');

// Check if current user has permission
const iAmAdmin = await plugin.system.checkMyAuthorization('admin');
```

### 4. Create Custom Permissions

```typescript
import { createAuthorization } from '@/lib/plugin-sdk';

await createAuthorization(
  'my-app:manage-data',
  'Manage Data',
  'Can create, edit, and delete data',
  'my-app-id'
);
```

### 5. Require Permissions

```typescript
import { requireAuthorization } from '@/lib/plugin-sdk';

async function deleteData(plugin, dataId) {
  // Ensure user has permission
  await requireAuthorization(plugin, 'my-app:manage-data');

  // Perform the delete
  await plugin.records.delete(dataId);
}
```

## Example: Simple Notes App

```typescript
import { createPlugin, requireAuthorization } from '@/lib/plugin-sdk';
import { createApp, createAuthorization } from '@/lib/plugin-sdk';

const APP_ID = 'notes-app';

// Define data structure
interface Note {
  title: string;
  content: string;
  createdBy: string;
}

// Initialize app (run once during installation)
async function install() {
  await createApp(
    APP_ID,
    'Notes App',
    '1.0.0',
    'Your Name',
    'you@example.com',
    'Simple note-taking app'
  );

  await createAuthorization(
    'notes-app:write',
    'Write Notes',
    'Can create and edit notes',
    APP_ID
  );
}

// Notes manager class
class NotesManager {
  constructor(private userId: string) {}

  async createNote(title: string, content: string) {
    const plugin = createPlugin<Note>(APP_ID, this.userId);
    await requireAuthorization(plugin, 'notes-app:write');

    return await plugin.records.create({
      title,
      content,
      createdBy: this.userId,
    });
  }

  async getNotes() {
    const plugin = createPlugin<Note>(APP_ID, this.userId);
    const result = await plugin.records.list();

    // Filter to only show notes created by this user
    return result.records.filter(
      record => record.data.createdBy === this.userId
    );
  }

  async updateNote(noteId: string, title: string, content: string) {
    const plugin = createPlugin<Note>(APP_ID, this.userId);
    await requireAuthorization(plugin, 'notes-app:write');

    const note = await plugin.records.read(noteId);
    if (note?.data.createdBy !== this.userId) {
      throw new Error('You can only edit your own notes');
    }

    return await plugin.records.update(noteId, { title, content });
  }

  async deleteNote(noteId: string) {
    const plugin = createPlugin<Note>(APP_ID, this.userId);
    await requireAuthorization(plugin, 'notes-app:write');

    const note = await plugin.records.read(noteId);
    if (note?.data.createdBy !== this.userId) {
      throw new Error('You can only delete your own notes');
    }

    return await plugin.records.delete(noteId);
  }
}

// Usage
const notes = new NotesManager('user-123');
await notes.createNote('My First Note', 'Hello, world!');
const myNotes = await notes.getNotes();
```

## Next Steps

- Read the full [Plugin SDK Documentation](./PLUGIN_SDK.md)
- See the [Task Manager Example](./lib/examples/example-plugin.ts)
- Run the [Test Suite](./lib/examples/test-plugin.ts)

## Key Concepts

### Data Sandboxing

Each app's data is automatically isolated:
- Your app: `app:my-app:records:*`
- Other apps: Cannot access your data
- Integration: Use REST APIs to share data between apps

### Permission System

Three-tier model:
1. **Users** - Individual user accounts
2. **Authorities** - Roles (admin, user, guest, custom)
3. **Authorizations** - Permissions (admin, developer, custom)

Users are assigned to an Authority, which grants them a set of Authorizations.

### TypeScript Support

Full type safety with generics:

```typescript
interface MyData {
  foo: string;
  bar: number;
}

const plugin = createPlugin<MyData>('my-app', userId);
// TypeScript enforces MyData structure
await plugin.records.create({ foo: 'test', bar: 42 });
```

## Common Patterns

### User Validation

```typescript
// Validate a user exists before assigning
if (assignedTo) {
  const user = await plugin.system.getUser(assignedTo);
  if (!user) {
    throw new Error('User not found');
  }
}
```

### Permission-Based Filtering

```typescript
// Show all data to admins, only user's data to others
const canViewAll = await plugin.system.checkMyAuthorization('my-app:view-all');

const result = await plugin.records.list();
const filtered = result.records.filter(record => {
  if (canViewAll) return true;
  return record.data.createdBy === userId;
});
```

### Batch Operations

```typescript
// Create multiple records efficiently
const records = await plugin.records.batchCreate([
  { name: 'Record 1' },
  { name: 'Record 2' },
  { name: 'Record 3' }
]);

// Read multiple records
const data = await plugin.records.batchRead(['id-1', 'id-2', 'id-3']);

// Delete multiple records
const count = await plugin.records.batchDelete(['id-1', 'id-2', 'id-3']);
```

## Troubleshooting

### "User ID is required" Error

Some methods require `requestingUserId` to be set:

```typescript
// Wrong
const plugin = createPlugin('my-app');
await plugin.system.checkMyAuthorization('admin'); // Error!

// Right
const plugin = createPlugin('my-app', userId);
await plugin.system.checkMyAuthorization('admin'); // Works!
```

### Permission Denied

Make sure the user has the required authorization:

```typescript
// Check permissions first
const hasPermission = await plugin.system.checkMyAuthorization('my-app:write');
if (!hasPermission) {
  throw new Error('Permission denied');
}

// Or use helper
await requireAuthorization(plugin, 'my-app:write');
```

## API Reference

| Method | Description |
|--------|-------------|
| `createPlugin(appId, userId?)` | Create a plugin instance |
| `plugin.records.create(data)` | Create a record |
| `plugin.records.read(id)` | Read a record |
| `plugin.records.update(id, data)` | Update a record |
| `plugin.records.delete(id)` | Delete a record |
| `plugin.records.list(options?)` | List records |
| `plugin.system.getUsers()` | Get all users |
| `plugin.system.getApps()` | Get all apps |
| `plugin.system.getAuthorities()` | Get all authorities |
| `plugin.system.getAuthorizations()` | Get all authorizations |
| `plugin.system.checkMyAuthorization(id)` | Check user permission |
| `requireAuthorization(plugin, id)` | Require permission (throws error) |

For complete API reference, see [PLUGIN_SDK.md](./PLUGIN_SDK.md).
