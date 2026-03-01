# Required Permissions

The `requiredPermissions` array in `app.json` declares authorizations that are essential for the app to function. These permissions are automatically granted during installation and are locked — administrators cannot remove them from the app's `app-specific:{appId}` authority.

---

## Declaration

```json
{
  "id": "my-app",
  "requiredPermissions": [
    "system:guest-accessible",
    "system:fs-access"
  ]
}
```

## Common System Permissions

| Permission                | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `system:guest-accessible` | Enables unauthenticated guest access for this app      |
| `system:fs-access`        | Grants the app access to the system filesystem API     |

You can also require authorizations from other apps: `{appId}:{authorizationId}`.

---

## How It Works

### Installation

1. The `requiredPermissions` array is read from the app package
2. The permissions are shown to the installing user during the approval step
3. Approved permissions are added to `app-specific:{appId}`
4. The list is stored in the app's database record

### Upgrade

When an app is upgraded, the `requiredPermissions` field is updated. New permissions required by the new version may be added.

### Admin UI Enforcement

When an administrator edits the app-specific authority in the admin panel:
- Required permissions are shown with a **Required** badge
- Their checkboxes are disabled and cannot be unchecked
- Attempting to toggle one shows: *"This permission is required by the application and cannot be removed"*

### Server-Side Enforcement

Permission updates are validated server-side. If an API request attempts to strip a required permission, the server rejects it:

```
400 Bad Request
{ "error": "Cannot remove required permissions: system:guest-accessible" }
```

---

## Example

An app that shares content publicly needs both guest access and filesystem permissions:

```json
{
  "id": "file-share",
  "requiredPermissions": [
    "system:guest-accessible",
    "system:fs-access"
  ],
  "applets": [
    { "id": "main",   "target": "app",   "component": "FileManager", ... },
    { "id": "viewer", "target": "guest", "component": "PublicViewer", ... }
  ]
}
```
