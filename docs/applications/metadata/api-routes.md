# API Route Metadata

API routes are declared in the `apiRoutes` array of `app.json`. Each entry registers an HTTP endpoint and maps it to a compiled route handler.

For implementation details — handler signatures, SDK usage, request/response patterns — see [API Routes](../api-routes.md).

---

## Declaration

```json
{
  "apiRoutes": [
    { "path": "items",           "method": "GET",    "description": "List all items" },
    { "path": "items",           "method": "POST",   "description": "Create a new item" },
    { "path": "items/[item-id]", "method": "GET",    "description": "Get item by ID" },
    { "path": "items/[item-id]", "method": "PATCH",  "description": "Update item" },
    { "path": "items/[item-id]", "method": "DELETE", "description": "Delete item" }
  ]
}
```

Routes are accessible at `/api/{appId}/{path}`.

## Route Properties

| Property      | Type     | Required | Description                                   |
| ------------- | -------- | -------- | --------------------------------------------- |
| `path`        | `string` | Yes      | URL path relative to `/api/{appId}/`          |
| `method`      | `string` | Yes      | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `description` | `string` | Yes      | Human-readable description of the endpoint   |

---

## Parameterized Paths

Wrap a path segment in brackets to declare a named URL parameter. The bracket notation matches the directory name for the handler file:

```json
{ "path": "items/[item-id]",                        "method": "GET" }
{ "path": "projects/[project-id]/tasks/[task-id]",  "method": "GET" }
```

Any segment at any depth can be parameterized. The parameter name is converted to camelCase when passed to the handler: `[item-id]` → `params.itemId`.

---

## File Mapping

Each route corresponds to a `route.ts` source file mirroring the path structure:

```
src/api/items/route.ts                        →  GET /api/{appId}/items
src/api/items/[item-id]/route.ts              →  GET /api/{appId}/items/:itemId
src/api/projects/[project-id]/tasks/route.ts  →  GET /api/{appId}/projects/:projectId/tasks
```

The compiled `route.js` in `dist/` is what the system loads at runtime.

---

## Multiple Methods on One Path

A single `route.ts` file handles all methods for that path. Declare each method separately in `apiRoutes` and export each as a named function:

```json
{ "path": "items", "method": "GET",  "description": "List items" },
{ "path": "items", "method": "POST", "description": "Create item" }
```

```typescript
// src/api/items/route.ts
export async function GET(req, context) { ... }
export async function POST(req, context) { ... }
```
