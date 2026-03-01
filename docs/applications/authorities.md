# Authorities and Permissions

> **Metadata reference** — for declaring authorizations, authorities, and required permissions in `app.json`, see [metadata/permissions/](./metadata/permissions/overview.md).

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

From API handlers, apps with `system:fs-access` can access the system filesystem through the plugin context:

```typescript
export async function GET(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;

  try {
    // Access system files (throws if app lacks system:fs-access)
    const entries = await plugin.systemFileManager.listDirectory('');
    return NextResponse.json({ files: entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
```

---

## Checking Permissions

### In API Handlers

```typescript
export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;

  // Check a single authorization
  const canManage = await plugin.isUserAuthorizedFor('my-app:manage');

  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check multiple authorizations ("some" = any one, "all" = every one)
  const hasAny = await plugin.isUserAuthorized(
    ['my-app:view', 'my-app:edit'],
    'some',
  );

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

export async function DELETE(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  // Check delete permission
  const canDelete = await plugin.isUserAuthorizedFor('document-manager:delete');
  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const docs = plugin.recordManager('document-manager', 'documents');

    // Get document
    const doc = await docs.readRecord(docId);
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete document
    await docs.deleteRecord(docId);
    await plugin.logger.info(`Document deleted: ${docId}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
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
  const { plugin } = context;

  // Check permissions FIRST
  const canCreate = await plugin.isUserAuthorizedFor('app:create');
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
  await plugin.logger.warn(`Access denied to ${resource}`);
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```
