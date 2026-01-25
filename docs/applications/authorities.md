# Authorities and Permissions

The Applicator framework uses a role-based access control (RBAC) system with support for fine-grained, resource-level permissions.

## Core Concepts

### Authorizations

Individual permissions that can be granted. Defined by apps to control access to features.

```json
{
  "authorizations": [
    {
      "id": "view",
      "name": "View Items",
      "description": "Can view items in the app"
    }
  ]
}
```

Authorization IDs are namespaced: `{appId}:{authorizationId}` (e.g., `my-app:view`)

### Authorities

Roles that bundle multiple authorizations together. Users are assigned an authority.

```json
{
  "authorities": [
    {
      "id": "viewer",
      "name": "Viewer",
      "authorizations": ["my-app:view"]
    }
  ]
}
```

### Hierarchy

```
User → Authority → Authorizations
                → App Access
```

---

## Authorization Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier within app |
| `name` | string | Yes | Display name |
| `description` | string | Yes | What this permission grants |
| `contextual` | boolean | No | Enable resource-level permissions |
| `target` | string | No | `"user"` or `"app"` |

### Target Types

- **`user`** (default): Permission for human users
- **`app`**: Permission for app-to-app API access

### Contextual Authorizations

Contextual authorizations enable fine-grained, resource-level permissions:

```json
{
  "authorizations": [
    {
      "id": "document-access",
      "name": "Document Access",
      "description": "Access to specific documents",
      "contextual": true,
      "target": "user"
    }
  ]
}
```

Use contextual permissions when you need to grant access to specific records rather than all records.

---

## Authority Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `authorizations` | array | No | List of authorization IDs |

---

## System Permissions

The framework provides built-in system authorizations:

| Authorization | Description |
|---------------|-------------|
| `system:admin` | Full administrator access |
| `system:developer` | Developer tools access |
| `system:assume-identity` | Impersonate other users |
| `system:fs-access` | Filesystem API access (app-only) |

### Built-in Authorities

| Authority | Authorizations |
|-----------|---------------|
| `system:admin` | `system:admin` |
| `system:user` | (none by default) |
| `system:guest` | (none by default) |

---

## Filesystem Access

The `system:fs-access` authorization allows apps to access the filesystem API.

### Requesting fs-access

Your app's authority can be granted `system:fs-access` by an administrator:

1. Install your app
2. Go to Administration → Authorities
3. Find your app's authority (`app-specific:{appId}`)
4. Add `system:fs-access` authorization

### Using fs-access

From API handlers, you can then call the filesystem API:

```typescript
export async function GET(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;

  // Check if app has fs-access
  const appId = plugin.appId;
  const hasAccess = await checkAppFsAccess(appId);

  if (hasAccess) {
    // Access filesystem
    const response = await fetch('/api/system/apps/fs', {
      headers: { 'X-App-Id': appId }
    });
  }
}
```

---

## Checking Permissions

### In API Handlers

```typescript
import { requireAuthorization } from '@/lib/sdk';

export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;

  // Method 1: Require authorization (throws if missing)
  await requireAuthorization(plugin, 'my-app:manage');

  // Method 2: Check authorization (returns boolean)
  const canManage = await plugin.hasAuthorization('my-app:manage');
  const canView = await plugin.system.checkMyAuthorization('my-app:view');

  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized operation
}
```

### In Agents

```typescript
const userId = 'user-to-check';
const hasAuth = await request('system.checkAuthorization', {
  userId,
  authorization: 'my-app:manage'
});

if (hasAuth) {
  // User has permission
}
```

---

## App-Specific Authorities

When your app is installed, the framework automatically creates an app-specific authority:

- ID: `app-specific:{appId}`
- Marked as contextual
- Can be granted system permissions like `fs-access`

This authority represents your app's permissions when making system-level API calls.

---

## User-Specific Authorities

Individual users can have permission overrides via user-specific authorities:

- ID: `user-specific:{userId}`
- Supplements the user's main authority
- Allows per-user permission customization

---

## Authorization Flow

### User Request

```
User makes request
    ↓
Get user's main authority
    ↓
Get user-specific authority (if exists)
    ↓
Combine authorizations from both
    ↓
Check if required authorization exists
    ↓
Allow or deny request
```

### App-to-App Request

```
App A makes API call with X-App-Id header
    ↓
Get app-specific authority for App A
    ↓
Check if required authorization exists
    ↓
Allow or deny request
```

---

## Example: Complete Permission Setup

### app.json

```json
{
  "id": "document-manager",
  "name": "Document Manager",
  "authorizations": [
    {
      "id": "view",
      "name": "View Documents",
      "description": "Can view documents"
    },
    {
      "id": "edit",
      "name": "Edit Documents",
      "description": "Can create and edit documents"
    },
    {
      "id": "delete",
      "name": "Delete Documents",
      "description": "Can delete documents"
    },
    {
      "id": "admin",
      "name": "Document Admin",
      "description": "Full administrative access"
    },
    {
      "id": "share",
      "name": "Share Documents",
      "description": "Can share documents with others",
      "contextual": true
    }
  ],
  "authorities": [
    {
      "id": "viewer",
      "name": "Document Viewer",
      "authorizations": ["document-manager:view"]
    },
    {
      "id": "editor",
      "name": "Document Editor",
      "authorizations": [
        "document-manager:view",
        "document-manager:edit"
      ]
    },
    {
      "id": "admin",
      "name": "Document Administrator",
      "authorizations": [
        "document-manager:view",
        "document-manager:edit",
        "document-manager:delete",
        "document-manager:admin"
      ]
    }
  ]
}
```

### API Handler

```typescript
// src/api/documents/delete.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthorization } from '@/lib/sdk';

export async function DELETE(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    // Check delete permission
    await requireAuthorization(plugin, 'document-manager:delete');

    // Get document
    const doc = await plugin.records.get('documents', docId);
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete document
    await plugin.records.delete('documents', docId);
    await plugin.logger.info(`Document deleted: ${docId}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    if (error.message.includes('Missing required authorization')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Best Practices

### 1. Use Descriptive Names

```json
{
  "id": "manage-templates",
  "name": "Manage Templates",
  "description": "Create, edit, and delete document templates"
}
```

### 2. Create Logical Role Groupings

```json
{
  "authorities": [
    {
      "id": "basic",
      "name": "Basic User",
      "authorizations": ["app:view"]
    },
    {
      "id": "power-user",
      "name": "Power User",
      "authorizations": ["app:view", "app:create", "app:edit"]
    },
    {
      "id": "admin",
      "name": "Administrator",
      "authorizations": ["app:view", "app:create", "app:edit", "app:delete", "app:admin"]
    }
  ]
}
```

### 3. Use Contextual Permissions Appropriately

Use contextual permissions for:
- Document-level sharing
- Record-specific access
- Resource-based permissions

Don't use contextual for:
- Feature flags
- Role-based access to entire app sections

### 4. Check Permissions Early

```typescript
export async function POST(req: NextRequest, context: { plugin: any }) {
  // Check permissions FIRST
  const canCreate = await context.plugin.hasAuthorization('app:create');
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Then process the request
  const body = await req.json();
  // ...
}
```

### 5. Log Permission Denials

```typescript
if (!hasPermission) {
  await plugin.logger.warn(`User ${plugin.userId} denied access to ${resource}`);
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```
