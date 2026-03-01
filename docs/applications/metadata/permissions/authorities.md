# Authorities

Authorities are roles that bundle one or more [authorizations](./authorizations.md) together. They are declared in the `authorities` array of `app.json`. Users are assigned an authority, which determines what they are permitted to do.

---

## Declaration

```json
{
  "authorities": [
    {
      "id": "viewer",
      "name": "Viewer",
      "authorizations": ["my-app:view"]
    },
    {
      "id": "editor",
      "name": "Editor",
      "authorizations": ["my-app:view", "my-app:edit"]
    },
    {
      "id": "admin",
      "name": "Administrator",
      "authorizations": [
        "my-app:view",
        "my-app:edit",
        "my-app:delete",
        "my-app:admin"
      ]
    }
  ]
}
```

## Properties

| Property         | Type       | Required | Description                                                |
| ---------------- | ---------- | -------- | ---------------------------------------------------------- |
| `id`             | `string`   | Yes      | Unique identifier within the app                           |
| `name`           | `string`   | Yes      | Display name shown in the admin UI and user management     |
| `authorizations` | `string[]` | No       | Full authorization IDs to include (format: `appId:authId`) |

---

## Contextual Role Assignment

Authorities can serve as **per-resource role labels** rather than global roles. Declare the authority in `app.json` with no (or few) global authorizations, then at runtime assign it to specific users for specific resources via a contextual authority record. This enables patterns like "user A is editor of library X, viewer of library Y."

### Example: Library Access Roles (files app)

```json
{
  "authorities": [
    { "id": "library-owner", "name": "Library Owner", "authorizations": [] },
    { "id": "library-editor", "name": "Library Editor", "authorizations": [] },
    { "id": "library-viewer", "name": "Library Viewer", "authorizations": [] }
  ]
}
```

These authorities have no global authorizations. They exist solely as role identifiers that the app assigns to users on a per-record basis at runtime.

### Assigning a Role to a User for a Resource

Access to resources using contextual authorities is granted using the contextual authority manager

```typescript
const caManager = context.contextualAuthorityManager;
const table = await caManager.getTable();

await caManager.createRecord(
  table,
  {
    permission: "files:library-owner",
    app: "files",
    user: user.id,
    created_at: Date.now(),
    created_by: user.id,
    context: JSON.stringify({ libraryId }),
  },
  { id: `files:library:owner:${libraryId}` },
);
```

You can also grant access to every user holding a particular system authority by setting `authority` instead of `user`:

```typescript
{
  permission: "files:library-viewer",
  app: "files",
  authority: "my-app:team-members",   // every user with this authority gets access
  context: JSON.stringify({ libraryId, accessLevel: "viewer" }),
}
```

### Querying a User's Access to a Resource

Fetch all grants for the resource group, then filter by the current user's ID (direct grants) and their authority (group grants):

```typescript
const allGrants = await caManager.getContextualAuthorities(
  "files",
  "library-access",
);

// Direct grants to this user
const userGrants = allGrants.filter((r) => r.data.user === user.id);

// Grants to a group/authority the user belongs to
const authorityGrants = allGrants.filter(
  (r) => r.data.authority === user.authorityId,
);

for (const grant of [...userGrants, ...authorityGrants]) {
  const { libraryId, accessLevel } = JSON.parse(grant.data.context || "{}");
  // accessLevel is "owner", "editor", or "viewer"
}
```

### CA ID Conventions

Structured, predictable IDs allow direct `readRecord` lookups without scanning all grants:

| Role            | ID Pattern                                                   |
| --------------- | ------------------------------------------------------------ |
| Owner           | `{appId}:library:owner:{libraryId}`                          |
| User grant      | `{appId}:library-access:user:{userId}:{libraryId}`           |
| Authority grant | `{appId}:library-access:authority:{authorityId}:{libraryId}` |

See [Contextual Authorities](../../contextual-authorities.md) for the full runtime API reference.

---

## Naming Conventions

Authority IDs do not need to be namespaced in declarations — the system handles that. However, the `authorizations` list always uses fully-qualified IDs (`appId:authId`).

The authority ID `admin` in app `my-app` is internally stored as `my-app:admin`.

---

## Best Practices

### Additive roles

Design authorities so higher roles include all permissions from lower roles:

```json
[
  { "id": "basic", "authorizations": ["app:view"] },
  {
    "id": "power-user",
    "authorizations": ["app:view", "app:create", "app:edit"]
  },
  {
    "id": "admin",
    "authorizations": [
      "app:view",
      "app:create",
      "app:edit",
      "app:delete",
      "app:admin"
    ]
  }
]
```

### Use descriptive names

Authority names are displayed in the user management UI. Use names that are meaningful to administrators assigning roles:

```json
{ "id": "read-only",    "name": "Read Only" }
{ "id": "contributor",  "name": "Contributor" }
{ "id": "site-manager", "name": "Site Manager" }
```

### Cross-app authorizations

An authority can include authorizations from other apps by using the full namespaced ID. This is common when your app depends on another and requires users to have a specific permission there:

```json
{ "id": "power-user", "authorizations": ["my-app:edit", "files:fs-access"] }
```
