# Authorizations

Authorizations are individual named permissions declared in the `authorizations` array of `app.json`. Once declared, they can be bundled into [authorities](./authorities.md) and granted to users.

---

## Declaration

```json
{
  "authorizations": [
    {
      "id": "view",
      "name": "View Items",
      "description": "Can view items in the app",
      "target": "user"
    },
    {
      "id": "manage",
      "name": "Manage Items",
      "description": "Can create, edit, and delete items",
      "target": "user"
    },
    {
      "id": "api-access",
      "name": "API Access",
      "description": "Allows another app to call this app's API",
      "target": "app"
    },
    {
      "id": "share",
      "name": "Share Document",
      "description": "Can share a specific document with others",
      "contextual": true,
      "target": "user"
    }
  ]
}
```

## Properties

| Property     | Type      | Required | Description                                          |
| ------------ | --------- | -------- | ---------------------------------------------------- |
| `id`         | `string`  | Yes      | Unique identifier within the app                     |
| `name`       | `string`  | Yes      | Display name shown in the admin UI                   |
| `description` | `string` | Yes      | What this permission grants                          |
| `target`     | `string`  | No       | Who can receive this: `"user"` (default) or `"app"`  |
| `contextual` | `boolean` | No       | If `true`, can be granted per-resource (default: `false`) |

---

## Namespacing

Authorization IDs are automatically namespaced to the app:

```
{appId}:{authorizationId}
```

For example, an authorization with `id: "manage"` in app `my-app` becomes `my-app:manage`. Always use the full namespaced form when referencing authorizations in authority declarations, `requiredPermissions`, and permission checks.

---

## Target Types

### `"user"` (default)

The authorization can be granted to human users via an authority. Use this for all standard feature permissions.

### `"app"`

The authorization can be granted to another app's `app-specific:{appId}` authority, enabling app-to-app API calls. The requesting app passes `X-App-Id` in its request headers.

---

## Contextual Authorizations

Setting `contextual: true` marks an authorization as resource-scoped. This means it can be granted to users for access to a specific record or resource, rather than granting access to all records of that type.

Use contextual authorizations for:
- Document-level sharing (a user can view one specific document)
- Password-protected link access
- Invitation-based resource access

Do not use contextual for broad feature flags or role-based access to entire app sections.

See [Contextual Authorities](../../contextual-authorities.md) for runtime usage.
