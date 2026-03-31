# Tables

Tables are declared in the `tables` array of `app.json`. Each entry defines a custom data table that is created in the database when the app is installed.

For runtime record operations (reading, creating, updating, deleting), see [API Routes — Records](../../api-routes.md).

---

## Declaration

```json
{
  "tables": [
    {
      "name": "task",
      "description": "Project tasks",
      "fields": [
        {
          "name": "title",
          "description": "Task title",
          "type": "string",
          "required": true
        },
        {
          "name": "status",
          "description": "Current status",
          "type": "picklist",
          "options": { "todo": "To Do", "in-progress": "In Progress", "done": "Done" },
          "defaultValue": "todo"
        },
        {
          "name": "dueDate",
          "description": "Due date",
          "type": "date"
        },
        {
          "name": "assignee",
          "description": "Assigned user",
          "type": "relationship",
          "relatedTo": "system:user"
        },
        {
          "name": "total",
          "description": "Computed cost total",
          "type": "formula"
        }
      ]
    }
  ]
}
```

## Table Properties

| Property      | Type     | Required | Description                           |
| ------------- | -------- | -------- | ------------------------------------- |
| `name`        | `string` | Yes      | Table identifier (used in record API) |
| `description` | `string` | Yes      | Human-readable description            |
| `fields`      | `array`  | Yes      | Field definitions (see below)         |

---

## Field Properties

| Property       | Type      | Required                 | Description                                             |
| -------------- | --------- | ------------------------ | ------------------------------------------------------- |
| `name`         | `string`  | Yes                      | Field identifier                                        |
| `description`  | `string`  | Yes                      | Human-readable description                              |
| `type`         | `string`  | Yes                      | Field type (see types table below)                      |
| `required`     | `boolean` | No                       | Whether field must have a value (default: `false`)      |
| `defaultValue` | `string`  | No                       | Default value applied on record creation                |
| `options`      | `object`  | For `picklist`/`multipicklist` | Map of `value → display label`                  |
| `relatedTo`    | `string`  | For `relationship`       | Related table reference (format: `appId:table` or `table`) |

---

## Field Types

| Type           | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| `string`       | Text content                                                 |
| `number`       | Numeric value                                                |
| `boolean`      | True/false                                                   |
| `date`         | Date value                                                   |
| `datetime`     | Date and time value                                          |
| `json`         | Arbitrary JSON data                                          |
| `password`     | Hashed password — automatically bcrypt-hashed on create/update |
| `picklist`     | Single selection from a fixed set of options                 |
| `multipicklist` | Multiple selections from a fixed set of options             |
| `relationship` | Foreign key reference to a record in another table           |
| `formula`      | Computed field — value is calculated, not stored directly. Cannot be `required`. |

### Picklist Options Format

```json
{
  "name": "priority",
  "type": "picklist",
  "options": {
    "low":    "Low Priority",
    "medium": "Medium Priority",
    "high":   "High Priority"
  }
}
```

Keys are the stored values; values are the display labels shown in the UI.

### Relationship `relatedTo` Format

```json
{ "name": "assignee", "type": "relationship", "relatedTo": "system:user" }
{ "name": "project",  "type": "relationship", "relatedTo": "task" }
{ "name": "invoice",  "type": "relationship", "relatedTo": "billing:invoice" }
```

- `system:user` — references a system user record
- `table` (no prefix) — references a table in the same app
- `appId:table` — references a table in another app

> **Gold standard:** Any field that stores the ID of another record **must** be declared as `"type": "relationship"` with the appropriate `relatedTo` — never as `"type": "string"`. This applies to all parent/owner/member references, self-referential hierarchy fields, and cross-app foreign keys. Using `string` for a field that is conceptually a foreign key bypasses platform-level referential integrity and loses the semantic information needed for cascade validation and tooling.

---

## TypeScript Typing for Record Data

`context.recordManager` accepts a generic type parameter `T` that becomes the type of `record.data`. Define a TypeScript interface for each table's data shape and pass it to `recordManager<T>()` to get fully typed access without casting.

**Relationship fields store IDs, not full records.** A `relationship` field in the database holds the foreign key string — the ID of the related record. Type these as `string` in your interface.

```typescript
// Define your data shapes with relationship fields typed as `string`
interface TaskData {
  title: string;
  status: string;
  assignee: string;       // relationship → stores the user's ID
  projectId: string;      // relationship → stores the project's ID
  dueDate?: number;
}

// Pass the type to recordManager — `record.data` is now fully typed
const tasks = context.recordManager<TaskData>("my-app", "task");
const record = await tasks.readRecord(taskId);
// record.data.assignee is `string`, no cast needed

// createRecord / updateRecord also benefit from the type
const table = await tasks.getTable();
await tasks.createRecord(table, {
  title: "My Task",
  status: "todo",
  assignee: userId,     // typed as string — just pass the ID
  projectId: projectId,
});
```

If you use `includeRelated`, the full related records come back in `result.related` (keyed by field name), while `record.data.assignee` still holds the ID string.

```typescript
const result = await tasks.readRecords({ includeRelated: ["assignee"] });
// result.related?.["record-id"]?.["assignee"] — the full related record(s)
// result.records[0].data.assignee               — still just the ID string
```

**Convention:** Define data interfaces in a shared `src/types/` directory and import them into route handlers. Do not use inline `as string` casts on relationship fields — that is a sign the type parameter was omitted from `recordManager`.

---

## Use Platform Features Instead of Custom Tables

Avoid defining tables for functionality the platform already provides:

| Instead of a custom table for… | Use… |
|---------------------------------|------|
| Sharing / access grants per user | [Contextual Authorities](../../contextual-authorities.md) |
| Notification history / delivery | `notifications.send` in agent SDK (see [agents.md](../../agents.md)) |

Creating custom tables for these purposes duplicates platform functionality, bypasses built-in delivery guarantees, and adds unnecessary data management overhead.
