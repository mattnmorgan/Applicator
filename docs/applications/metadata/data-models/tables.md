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

---

## Use Platform Features Instead of Custom Tables

Avoid defining tables for functionality the platform already provides:

| Instead of a custom table for… | Use… |
|---------------------------------|------|
| Sharing / access grants per user | [Contextual Authorities](../../contextual-authorities.md) |
| Notification history / delivery | `notifications.send` in agent SDK (see [agents.md](../../agents.md)) |

Creating custom tables for these purposes duplicates platform functionality, bypasses built-in delivery guarantees, and adds unnecessary data management overhead.
