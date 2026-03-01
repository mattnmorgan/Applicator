# App Metadata Overview

The `app.json` file is the manifest for every Applicator app. It lives at `src/meta/app.json` and declares the app's identity, data model, permissions, routes, background agents, and UI entry points. The system reads this file during installation and upgrade.

## Full Structure

```json
{
  "id": "my-app",
  "name": "My Application",
  "version": { "major": 1, "minor": 0, "dev": 0 },
  "author": "Your Name",
  "contactEmail": "you@example.com",
  "description": "Description of what your app does",
  "requiredPermissions": [],
  "dependencies": {},
  "tables": [],
  "authorizations": [],
  "authorities": [],
  "apiRoutes": [],
  "agents": [],
  "applets": []
}
```

## Required Fields

| Field       | Type     | Description                                          |
| ----------- | -------- | ---------------------------------------------------- |
| `id`        | `string` | Unique app identifier. Cannot be `"system"`.         |
| `name`      | `string` | Human-readable app name                              |
| `version`   | `object` | Semantic version with `major`, `minor`, `dev` fields |
| `author`    | `string` | Author name                                          |
| `description` | `string` | App description                                    |
| `applets`   | `array`  | At least one applet must be defined                  |

## Optional Fields

| Field                | Type       | Description                                          |
| -------------------- | ---------- | ---------------------------------------------------- |
| `contactEmail`       | `string`   | Support or contact email                             |
| `requiredPermissions` | `string[]` | Permissions that are locked and cannot be removed   |
| `dependencies`       | `object`   | Other apps this app depends on (min version map)     |
| `tables`             | `array`    | Custom data table definitions                        |
| `authorizations`     | `array`    | Permission declarations                              |
| `authorities`        | `array`    | Role declarations                                    |
| `apiRoutes`          | `array`    | HTTP endpoint declarations                           |
| `agents`             | `array`    | Background task declarations                         |

---

## Version

```json
{ "major": 1, "minor": 2, "dev": 3 }
```

Represents version `1.2.3`. When upgrading, the new version must be strictly greater than the installed version. Comparison is left-to-right: major → minor → dev.

---

## Dependencies

Declare other apps that must be installed before this app can be installed:

```json
{
  "dependencies": {
    "files": { "major": 1, "minor": 0, "dev": 0 }
  }
}
```

- All listed apps must be installed
- Installed version must be ≥ the declared minimum
- An app cannot depend on itself

---

## Section Reference

| Section              | Documentation                                                          |
| -------------------- | ---------------------------------------------------------------------- |
| `tables`             | [Data Models → Tables](./data-models/tables.md)                        |
| `authorizations`     | [Permissions → Authorizations](./permissions/authorizations.md)        |
| `authorities`        | [Permissions → Authorities](./permissions/authorities.md)              |
| `requiredPermissions` | [Permissions → Required Permissions](./permissions/required.md)       |
| `apiRoutes`          | [API Route Metadata](./api-routes.md)                                  |
| `agents`             | [Agent Metadata](./agents.md)                                          |
| `applets`            | [Applet Contexts](./applet-contexts/overview.md)                       |
