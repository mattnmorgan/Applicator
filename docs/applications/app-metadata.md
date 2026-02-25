# App Metadata (app.json)

The `app.json` file is the manifest for your Applicator app. It defines metadata, tables, permissions, API routes, applets, and agents.

## Basic Structure

```json
{
  "id": "my-app",
  "name": "My Application",
  "version": {
    "major": 1,
    "minor": 0,
    "dev": 0
  },
  "author": "Your Name",
  "contactEmail": "you@example.com",
  "description": "Description of what your app does",
  "applets": []
}
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (cannot be "system") |
| `name` | string | Human-readable app name |
| `version` | object | Version with `major`, `minor`, `dev` numbers |
| `author` | string | Author name |
| `description` | string | App description |
| `applets` | array | At least one applet must be defined |

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `contactEmail` | string | Support email address |
| `dependencies` | object | Map of required app IDs to minimum versions |
| `tables` | array | Custom data table definitions |
| `authorizations` | array | Permission definitions |
| `authorities` | array | Role definitions |
| `apiRoutes` | array | API endpoint definitions |
| `agents` | array | Background task definitions |

---

## Version

Version numbers follow semantic versioning with three components:

```json
{
  "version": {
    "major": 1,
    "minor": 2,
    "dev": 3
  }
}
```

This represents version `1.2.3`. During upgrades:
- New version must be strictly greater than the existing version
- Comparison is done left-to-right: major → minor → dev

---

## Dependencies

Declare dependencies on other apps:

```json
{
  "dependencies": {
    "files": {
      "major": 1,
      "minor": 0,
      "dev": 0
    }
  }
}
```

During installation:
- All dependencies must be installed
- Installed version must be >= specified minimum
- Apps cannot depend on themselves

---

## Tables

Define custom data tables for your app:

```json
{
  "tables": [
    {
      "name": "my-table",
      "description": "Stores my data",
      "fields": [
        {
          "name": "title",
          "description": "Item title",
          "type": "string",
          "required": true
        },
        {
          "name": "status",
          "description": "Current status",
          "type": "picklist",
          "options": { "pending": "Pending", "active": "Active", "completed": "Completed" },
          "defaultValue": "pending"
        },
        {
          "name": "dueDate",
          "description": "Due date",
          "type": "date"
        },
        {
          "name": "metadata",
          "description": "Additional data",
          "type": "json"
        },
        {
          "name": "assignee",
          "description": "Assigned user",
          "type": "relationship",
          "relatedTo": "system:user"
        },
        {
          "name": "total",
          "description": "Calculated total",
          "type": "formula"
        }
      ]
    }
  ]
}
```

### Supported Field Types

| Type | Description | Additional Properties |
|------|-------------|----------------------|
| `string` | Text content | - |
| `number` | Numeric values | - |
| `boolean` | True/false values | - |
| `date` | Date values | - |
| `datetime` | Date and time values | - |
| `json` | JSON data structures | - |
| `password` | Hashed password field | Automatically hashed on create/update |
| `picklist` | Single selection from options | `options` (object: id to label map) |
| `multipicklist` | Multiple selections from options | `options` (object: id to label map) |
| `relationship` | Foreign key reference | `relatedTo` (format: `app:table` or `table`) |
| `formula` | Computed field | Cannot be `required`, requires formula script |

### Field Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Field identifier |
| `description` | string | Yes | Human-readable description |
| `type` | string | Yes | One of: `string`, `number`, `boolean`, `date`, `datetime`, `json`, `password`, `picklist`, `multipicklist`, `relationship`, `formula` |
| `required` | boolean | No | Whether field is required (default: false) |
| `defaultValue` | string | No | Default value for new records |
| `options` | object | For picklist | Map of value to display label: `{"a": "Label A", "b": "Label B"}` |
| `relatedTo` | string | For relationship | Related table reference |

### Picklist Options

Options are defined as an object mapping values to display labels:

```json
{
  "name": "priority",
  "type": "picklist",
  "options": {
    "low": "Low Priority",
    "medium": "Medium Priority",
    "high": "High Priority"
  }
}
```

---

## Table Validation and Formulas

Fields can have custom validation logic and formula calculations via JavaScript files in the `tables/` directory.

### Directory Structure

```
tables/
└── {table-name}/
    └── {field-name}/
        ├── validator.js    # Custom validation script
        └── formula.js      # Formula calculation script
```

Example:
```
tables/
└── order/
    ├── email/
    │   └── validator.js    # Validates email format
    └── total/
        └── formula.js      # Calculates order total
```

### Validator Scripts

Validators run when records are created or updated. They must export a function that returns `true` (valid) or `false` (invalid).

**File:** `tables/{table}/{field}/validator.js`

```javascript
// Validator receives a context object
module.exports = function(context) {
  const { value, record, field } = context;

  // value: The current field value being validated
  // record: The full record data
  // field: The field definition

  // Example: Validate email format
  if (!value) return true; // Allow empty if not required

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};
```

**Context Object:**

| Property | Type | Description |
|----------|------|-------------|
| `value` | any | The field value being validated |
| `record` | object | The full record data |
| `field` | object | Field definition (name, type, etc.) |

**Examples:**

```javascript
// Validate minimum length
module.exports = function({ value }) {
  if (!value) return true;
  return value.length >= 3;
};
```

```javascript
// Validate number range
module.exports = function({ value }) {
  if (value === undefined || value === null) return true;
  return value >= 0 && value <= 100;
};
```

```javascript
// Cross-field validation
module.exports = function({ value, record }) {
  // End date must be after start date
  if (!value || !record.startDate) return true;
  return new Date(value) > new Date(record.startDate);
};
```

### Formula Scripts

Formulas compute field values automatically when records are created or updated. They must export a function that returns the calculated value.

**File:** `tables/{table}/{field}/formula.js`

```javascript
// Formula receives a context object
module.exports = function(context) {
  const { record, field } = context;

  // record: The full record data (including other fields)
  // field: The field definition

  // Example: Calculate total from quantity and price
  const quantity = record.quantity || 0;
  const price = record.price || 0;
  return quantity * price;
};
```

**Context Object:**

| Property | Type | Description |
|----------|------|-------------|
| `record` | object | The full record data |
| `field` | object | Field definition (name, type, etc.) |

**Important:** Formula fields:
- Cannot be marked as `required`
- Cannot be directly set by users (always computed)
- Are calculated after other fields are set

**Examples:**

```javascript
// Full name from first and last name
module.exports = function({ record }) {
  return `${record.firstName || ''} ${record.lastName || ''}`.trim();
};
```

```javascript
// Status based on due date
module.exports = function({ record }) {
  if (!record.dueDate) return 'no-date';
  const due = new Date(record.dueDate);
  const now = new Date();
  if (due < now) return 'overdue';
  if (due - now < 86400000) return 'due-soon'; // 24 hours
  return 'on-track';
};
```

```javascript
// Complex calculation
module.exports = function({ record }) {
  const subtotal = (record.items || []).reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );
  const tax = subtotal * 0.1;
  return subtotal + tax;
};
```

### Webpack Configuration for Tables

Include the tables directory in your webpack copy configuration:

```javascript
// webpack.config.js
new CopyWebpackPlugin({
  patterns: [
    { from: "app.json", to: "app.json" },
    { from: "app.png", to: "app.png", noErrorOnMissing: true },
    { from: "tables", to: "tables", noErrorOnMissing: true },  // ← Add this
    { from: "assets", to: "assets", noErrorOnMissing: true }
  ]
})
```

The `tables/` directory is extracted during installation and scripts are stored at:
```
{storage}/apps/{appId}/tables/{tableName}/{fieldName}/validator.js
{storage}/apps/{appId}/tables/{tableName}/{fieldName}/formula.js
```

---

## Authorizations

Define permissions for your app:

```json
{
  "authorizations": [
    {
      "id": "view",
      "name": "View Items",
      "description": "Can view items in the app",
      "contextual": false,
      "target": "user"
    },
    {
      "id": "manage",
      "name": "Manage Items",
      "description": "Can create, edit, and delete items",
      "contextual": false,
      "target": "user"
    },
    {
      "id": "api-access",
      "name": "API Access",
      "description": "Can access this app's API",
      "contextual": false,
      "target": "app"
    }
  ]
}
```

### Authorization Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier within app |
| `name` | string | Yes | Display name |
| `description` | string | Yes | What this permission grants |
| `contextual` | boolean | No | If true, can be granted per-resource |
| `target` | string | No | `"user"` or `"app"` - who can receive this |

Authorization IDs are namespaced to your app: `{appId}:{authorizationId}` (e.g., `my-app:view`).

### Contextual Authorizations

Contextual authorizations enable fine-grained, resource-level permissions. Use these when you need to grant access to specific records rather than the entire app.

---

## Authorities

Define roles that bundle authorizations:

```json
{
  "authorities": [
    {
      "id": "viewer",
      "name": "Viewer",
      "authorizations": ["my-app:view"]
    },
    {
      "id": "manager",
      "name": "Manager",
      "authorizations": ["my-app:view", "my-app:manage"]
    }
  ]
}
```

### Authority Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `authorizations` | array | No | List of authorization IDs (format: `appId:authId`) |

---

## API Routes

Declare API endpoints:

```json
{
  "apiRoutes": [
    {
      "path": "items/list",
      "method": "GET",
      "description": "List all items"
    },
    {
      "path": "items/create",
      "method": "POST",
      "description": "Create a new item"
    },
    {
      "path": "items/update",
      "method": "PUT",
      "description": "Update an item"
    },
    {
      "path": "items/delete",
      "method": "DELETE",
      "description": "Delete an item"
    }
  ]
}
```

Routes are accessible at `/api/{appId}/{path}`. See [API Routes](./api-routes.md) for implementation details.

---

## Applets

Define UI components that integrate into the framework:

```json
{
  "applets": [
    {
      "id": "main",
      "label": "My App",
      "description": "Main application view",
      "target": "app",
      "component": "Dashboard"
    },
    {
      "id": "home-widget",
      "label": "Quick View",
      "description": "Home page widget",
      "target": "home",
      "component": "HomeWidget"
    },
    {
      "id": "user-settings",
      "label": "My Settings",
      "description": "User preferences",
      "target": "user-settings",
      "component": "UserSettingsWidget"
    },
    {
      "id": "system-settings",
      "label": "App Configuration",
      "description": "System-wide settings",
      "target": "system-settings",
      "component": "SystemSettingsWidget"
    }
  ]
}
```

### Applet Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier within app |
| `label` | string | Yes | Display label |
| `description` | string | Yes | Description shown to users |
| `target` | string | Yes | Where the applet appears |
| `component` | string | Yes | Exported component name from app.js |
| `settings` | array | No | Setting definitions for per-instance configuration |

### Applet Settings

Applets with `target: "home"` can define settings that users configure per-instance on their homescreen. Each setting descriptor defines a configurable field:

```json
{
  "id": "home-widget",
  "label": "Quick View",
  "target": "home",
  "component": "HomeWidget",
  "description": "Configurable home widget",
  "settings": [
    {
      "name": "color",
      "label": "Theme Color",
      "type": "picklist",
      "default": "blue",
      "options": {
        "blue": "Blue",
        "green": "Green",
        "red": "Red"
      }
    },
    {
      "name": "showCount",
      "label": "Show Item Count",
      "type": "boolean",
      "default": true
    },
    {
      "name": "maxItems",
      "label": "Maximum Items",
      "type": "number",
      "default": 5
    }
  ]
}
```

#### Setting Descriptor Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Setting identifier |
| `label` | string | Yes | Display label shown to the user |
| `type` | string | Yes | One of: `string`, `number`, `boolean`, `picklist`, `multipicklist` |
| `default` | any | No | Default value |
| `options` | object | For picklist | Map of value to display label |

Setting values are stored per-user in the `applet_settings` system table and passed to the component via the `settings` prop.

### Applet Targets

| Target | Description |
|--------|-------------|
| `app` | Main application view (accessible from app list) |
| `home` | Dashboard widget on the home page |
| `user-settings` | Widget in user settings |
| `system-settings` | Widget in system settings (admin only) |
| `guest` | Displayed to unauthenticated guest users via shared links |

---

## Agents

Define background tasks:

```json
{
  "agents": [
    {
      "name": "cleanup-agent",
      "label": "Daily Cleanup",
      "description": "Cleans up old records daily",
      "cron": "0 0 * * *"
    },
    {
      "name": "worker-agent",
      "label": "Background Worker",
      "description": "Continuous background worker"
    }
  ]
}
```

### Agent Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Agent identifier (must match the agent script filename) |
| `label` | string | No | Human-readable display name shown in the admin UI |
| `description` | string | Yes | What the agent does |
| `cron` | string | No | CRON schedule (if omitted, runs continuously) |

See [Agents](./agents.md) for implementation details.

---

## Complete Example

```json
{
  "id": "task-manager",
  "name": "Task Manager",
  "version": {
    "major": 1,
    "minor": 0,
    "dev": 0
  },
  "author": "Developer",
  "contactEmail": "dev@example.com",
  "description": "A task management application",
  "dependencies": {
    "files": { "major": 1, "minor": 0, "dev": 0 }
  },
  "tables": [
    {
      "name": "task",
      "description": "Tasks",
      "fields": [
        { "name": "title", "description": "Task title", "type": "string", "required": true },
        { "name": "status", "description": "Status", "type": "picklist", "options": { "todo": "To Do", "in-progress": "In Progress", "done": "Done" } },
        { "name": "assignee", "description": "Assigned to", "type": "relationship", "relatedTo": "system:user" }
      ]
    }
  ],
  "authorizations": [
    { "id": "view", "name": "View Tasks", "description": "Can view tasks" },
    { "id": "manage", "name": "Manage Tasks", "description": "Can create and edit tasks" }
  ],
  "authorities": [
    { "id": "user", "name": "Task User", "authorizations": ["task-manager:view"] },
    { "id": "admin", "name": "Task Admin", "authorizations": ["task-manager:view", "task-manager:manage"] }
  ],
  "apiRoutes": [
    { "path": "list", "method": "GET", "description": "List tasks" },
    { "path": "create", "method": "POST", "description": "Create task" }
  ],
  "applets": [
    { "id": "main", "label": "Tasks", "description": "Task manager", "target": "app", "component": "TaskManager" },
    { "id": "widget", "label": "My Tasks", "description": "Task widget", "target": "home", "component": "TaskWidget" }
  ],
  "agents": [
    { "name": "reminder", "label": "Daily Reminder", "description": "Send task reminders", "cron": "0 9 * * *" }
  ]
}
```
