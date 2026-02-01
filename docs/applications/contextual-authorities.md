# Contextual Authorities

Contextual authorities provide fine-grained, resource-level access control. Unlike regular authorities that grant broad permissions, contextual authorities scope permissions to specific records or contexts within your app.

## Use Cases

- Sharing a document with specific users via a link
- Granting password-protected access to a resource
- Allowing users with a particular authority to access a record
- Enabling guest (unauthenticated) access to specific content

## Types of Contextual Authorities

There are three types, each scoped differently:

| Type | Scope | Key Format |
|------|-------|------------|
| **Password** | Anyone with the password | `{appId}:{recordId}:password:{timestamp}` |
| **User** | A specific user | `{appId}:{recordId}:user:{userId}` |
| **Authority** | Users with a specific authority | `{appId}:{recordId}:authority:{authorityId}` |

## Data Model

```typescript
interface ContextualAuthority {
  permission: string;     // Permission string for this authority
  user?: string;          // User ID (user-scoped only)
  authority?: string;     // Authority ID (authority-scoped only)
  password?: string;      // Hashed password (password-protected only)
  app: string;            // App that owns this authority
  createdAt: number;      // Creation timestamp
  createdBy: string;      // User ID of the creator
  context?: string;       // Optional JSON string of app-specific context data
}
```

The `context` field is particularly useful for storing metadata about what the authority grants access to (e.g., a document ID, view mode, or other app-specific data).

---

## Accessing the Manager

The contextual authority manager is available through the plugin context in your API handlers:

```typescript
export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const caManager = plugin.contextualAuthorityManager;

  // Use caManager to create, query, or delete contextual authorities
}
```

---

## Creating Contextual Authorities

### Password-Protected

Creates an authority that anyone can use if they provide the correct password. The password is automatically hashed with bcrypt before storage.

```typescript
const ca = await caManager.createPasswordContextualAuthority({
  app: 'my-app',
  recordId: 'share',            // Domain-specific grouping key
  permission: 'my-app:view',    // Permission this authority grants
  password: 'secret123',        // Plaintext password (hashed automatically)
  createdBy: user.id,           // Creator's user ID
  context: JSON.stringify({     // Optional app-specific data
    documentId: 'doc-123',
    viewMode: 'readonly',
  }),
});

// ca.id = "my-app:share:password:1706000000000"
```

### User-Scoped

Creates an authority scoped to a specific user.

```typescript
const ca = await caManager.createUserContextualAuthority({
  app: 'my-app',
  recordId: 'share',
  permission: 'my-app:view',
  user: 'target-user-id',
  createdBy: user.id,
  context: JSON.stringify({
    documentId: 'doc-123',
  }),
});

// ca.id = "my-app:share:user:target-user-id"
```

### Authority-Scoped

Creates an authority accessible to any user who has a specific system authority.

```typescript
const ca = await caManager.createAuthorityContextualAuthority({
  app: 'my-app',
  recordId: 'share',
  permission: 'my-app:view',
  authority: 'system:user',     // Any user with this authority can access
  createdBy: user.id,
  context: JSON.stringify({
    documentId: 'doc-123',
  }),
});

// ca.id = "my-app:share:authority:system:user"
```

---

## Querying Contextual Authorities

### Get All for a Record Group

Retrieve all contextual authorities for a specific app and record grouping:

```typescript
const authorities = await caManager.getContextualAuthorities('my-app', 'share');
// Returns: TableRecord<ContextualAuthority>[]

for (const ca of authorities) {
  console.log(ca.id);            // e.g., "my-app:share:password:1706000000000"
  console.log(ca.data.permission);
  console.log(ca.data.context);  // JSON string of app-specific data
}
```

This matches all records whose keys start with `{appId}:{recordId}:`, regardless of type (password, user, or authority).

---

## Deleting Contextual Authorities

Remove a contextual authority by its ID:

```typescript
const deleted = await caManager.deleteContextualAuthority(
  'my-app:share:password:1706000000000'
);
// Returns: true if deleted, false if not found
```

---

## The `recordId` Parameter

The `recordId` parameter serves as a domain-specific grouping key. It is not tied to any database record; you define what it means for your app. Common patterns:

| Pattern | Description |
|---------|-------------|
| `"share"` | Group all sharing-related authorities |
| `"doc-{id}"` | Group authorities per document |
| `"project-{id}"` | Group authorities per project |
| `"invite"` | Group invitation authorities |

This allows you to query all related authorities efficiently using `getContextualAuthorities(appId, recordId)`.

---

## Complete Example: Shareable Links

```typescript
// API: Create a share link
export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const user = await plugin.user();
  const body = await req.json();
  const { documentId, password } = body;

  const caManager = plugin.contextualAuthorityManager;

  // Create password-protected contextual authority
  const ca = await caManager.createPasswordContextualAuthority({
    app: 'my-app',
    recordId: 'share',
    permission: 'my-app:view',
    password: password || 'default',
    createdBy: user.id,
    context: JSON.stringify({ documentId }),
  });

  // The share URL includes the contextual authority ID
  const shareUrl = `/guest/my-app?context=${encodeURIComponent(ca.id)}`;

  return NextResponse.json({ shareUrl, contextId: ca.id });
}
```

```typescript
// API: List all shares
export async function GET(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const caManager = plugin.contextualAuthorityManager;

  const shares = await caManager.getContextualAuthorities('my-app', 'share');

  return NextResponse.json({
    shares: shares.map(s => ({
      id: s.id,
      createdAt: s.data.createdAt,
      createdBy: s.data.createdBy,
      hasPassword: !!s.data.password,
      context: s.data.context ? JSON.parse(s.data.context) : null,
    })),
  });
}
```

```typescript
// API: Revoke a share link
export async function DELETE(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const { searchParams } = new URL(req.url);
  const contextId = searchParams.get('id');

  const caManager = plugin.contextualAuthorityManager;
  await caManager.deleteContextualAuthority(contextId);

  return NextResponse.json({ success: true });
}
```
