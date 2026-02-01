# Required Permissions

Required permissions allow apps to declare authorizations that are essential for their operation. When an app specifies required permissions, they are stored in the app record and enforced by the platform: administrators cannot remove them from the app's authority.

## Declaring Required Permissions

Add a `requiredPermissions` array to your `app.json` with the full authorization IDs your app needs:

```json
{
  "id": "my-app",
  "name": "My App",
  "version": { "major": 1, "minor": 0, "dev": 0 },
  "author": "Developer",
  "description": "An app that needs specific permissions",
  "requiredPermissions": [
    "system:guest-accessible",
    "system:fs-access"
  ],
  "applets": [
    { "id": "main", "label": "My App", "target": "app", "component": "Main", "description": "Main view" }
  ]
}
```

### Common System Permissions

| Permission | Description |
|-----------|-------------|
| `system:guest-accessible` | Enables guest (unauthenticated) access for the app |
| `system:fs-access` | Grants access to the system filesystem |

You can also require permissions from other apps using the format `{appId}:{authorizationId}`.

---

## How It Works

### During Installation

1. The installer reads `requiredPermissions` from the app package
2. The user is shown the required permissions during the approval step
3. Approved permissions are added to the app-specific authority (`app-specific:{appId}`)
4. The `requiredPermissions` array is stored in the app record in the database

### During Upgrade

When an app is upgraded, the `requiredPermissions` field is updated to reflect the new version's requirements. New required permissions may be added in subsequent versions.

### In the Authority UI

When an administrator edits the app-specific authority:
- Required permissions are shown with a **Required** badge
- Their checkboxes are disabled and cannot be unchecked
- Attempting to toggle a required permission shows an error: "This permission is required by the application and cannot be removed"

### Server-Side Enforcement

The platform validates authority updates on the server. If an API request attempts to update an app-specific authority and removes any required permissions, the server rejects it with:

```
400 Bad Request
{ "error": "Cannot remove required permissions: system:guest-accessible, system:fs-access" }
```

This prevents bypassing the UI restriction through direct API calls.

---

## Example

An app that shares content publicly needs both guest access and filesystem access:

```json
{
  "id": "file-share",
  "name": "File Sharing",
  "version": { "major": 1, "minor": 0, "dev": 0 },
  "author": "Developer",
  "description": "Share files publicly",
  "requiredPermissions": [
    "system:guest-accessible",
    "system:fs-access"
  ],
  "authorizations": [
    {
      "id": "share",
      "name": "Create Shares",
      "description": "Can create public share links",
      "target": "user"
    }
  ],
  "applets": [
    { "id": "main", "label": "File Share", "target": "app", "component": "FileManager", "description": "Manage shared files" },
    { "id": "viewer", "label": "Public Viewer", "target": "guest", "component": "PublicViewer", "description": "View shared files" }
  ],
  "apiRoutes": [
    { "path": "files/list", "method": "GET", "description": "List files" },
    { "path": "files/share", "method": "POST", "description": "Create share link" }
  ]
}
```

After installation, the app-specific authority for `file-share` will always include `system:guest-accessible` and `system:fs-access`, and these cannot be removed by administrators.
