# Permissions Overview

Applicator uses a role-based access control (RBAC) system. Apps declare their own **authorizations** (individual permissions) and **authorities** (roles that bundle authorizations). Users are assigned an authority, which determines what they are allowed to do.

---

## Model

```
User → Authority → Authorizations
App  → app-specific:{appId} → Authorizations
```

- An **authorization** is a named permission, e.g. `my-app:edit`.
- An **authority** is a named role that includes a set of authorizations, e.g. `my-app:editor`.
- Each user is assigned exactly one authority (plus an optional user-specific override authority).
- Each app has an automatically-created `app-specific:{appId}` authority that controls what the app itself can do when making system-level calls.

---

## System Permissions

The framework provides built-in authorizations that apps and administrators can use:

| Authorization           | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `system:admin`          | Full system administrator access                      |
| `system:developer`      | Developer tools access                                |
| `system:assume-identity` | Can impersonate other users                          |
| `system:fs-access`      | Access to the system filesystem API (app-only)        |
| `system:guest-accessible` | Enables unauthenticated guest access for the app    |

## Built-in Authorities

| Authority        | Default Authorizations |
| ---------------- | ---------------------- |
| `system:admin`   | `system:admin`         |
| `system:user`    | (none by default)      |
| `system:guest`   | (none by default)      |

---

## App-Specific Authority

When an app is installed, the framework automatically creates:

- **ID:** `app-specific:{appId}`
- Represents the app's own permissions when making system calls
- Administrators grant system permissions (like `system:fs-access`) to this authority

---

## User-Specific Authority

Each user optionally has a user-specific authority:

- **ID:** `user-specific:{userId}`
- Supplements the user's main authority
- Allows per-user permission overrides without changing the shared authority

---

## Authorization Flow

### User Request

```
User makes request
    → User's main authority
    → User-specific authority (if any)
    → Combined authorizations checked
    → Allow or deny
```

### App-to-App Request

```
App A sends request with X-App-Id header
    → app-specific:{appA} authority
    → Authorizations checked
    → Allow or deny
```

---

## Detailed Reference

| Topic | Reference |
| ----- | --------- |
| Declaring authorizations in `app.json` | [Authorizations](./authorizations.md) |
| Declaring authorities in `app.json` | [Authorities](./authorities.md) |
| Locking permissions with `requiredPermissions` | [Required Permissions](./required.md) |
| Resource-level (contextual) access | [Contextual Authorities](../contextual-authorities.md) |
