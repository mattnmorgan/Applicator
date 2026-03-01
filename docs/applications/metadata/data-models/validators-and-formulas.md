# Validators and Formulas

Fields can have custom validation logic and computed values via JavaScript files placed in a `tables/` directory alongside `app.json`. These scripts are bundled with the app and stored on the server during installation.

---

## Directory Structure

```
src/meta/
  app.json
  tables/
    {table-name}/
      {field-name}/
        validator.js    ← custom validation for the field
        formula.js      ← formula calculation for the field
```

Example:

```
tables/
└── order/
    ├── email/
    │   └── validator.js    ← validates email format
    └── total/
        └── formula.js      ← calculates order total
```

---

## Validator Scripts

Validators run when a record is created or updated. They receive a context object and must return `true` (valid) or `false` (invalid).

**File:** `tables/{table}/{field}/validator.js`

### Context Object

| Property | Type     | Description                              |
| -------- | -------- | ---------------------------------------- |
| `value`  | `any`    | The field value being validated          |
| `record` | `object` | The full record data                     |
| `field`  | `object` | The field definition (name, type, etc.)  |

### Examples

```javascript
// Email format
module.exports = function({ value }) {
  if (!value) return true; // allow empty if not required
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};
```

```javascript
// Minimum length
module.exports = function({ value }) {
  if (!value) return true;
  return value.length >= 3;
};
```

```javascript
// Number range
module.exports = function({ value }) {
  if (value === undefined || value === null) return true;
  return value >= 0 && value <= 100;
};
```

```javascript
// Cross-field: end date must be after start date
module.exports = function({ value, record }) {
  if (!value || !record.startDate) return true;
  return new Date(value) > new Date(record.startDate);
};
```

---

## Formula Scripts

Formulas compute a field's value automatically whenever a record is created or updated. The computed value is stored alongside the record; users cannot set formula fields directly.

**File:** `tables/{table}/{field}/formula.js`

The field must be declared with `"type": "formula"` in `app.json` and cannot be marked `required`.

### Context Object

| Property | Type     | Description                          |
| -------- | -------- | ------------------------------------ |
| `record` | `object` | The full record data (after all other fields are set) |
| `field`  | `object` | The field definition                 |

### Examples

```javascript
// Quantity × price
module.exports = function({ record }) {
  return (record.quantity || 0) * (record.price || 0);
};
```

```javascript
// Full name from parts
module.exports = function({ record }) {
  return `${record.firstName || ''} ${record.lastName || ''}`.trim();
};
```

```javascript
// Status derived from due date
module.exports = function({ record }) {
  if (!record.dueDate) return 'no-date';
  const due = new Date(record.dueDate);
  const now = new Date();
  if (due < now) return 'overdue';
  if (due - now < 86400000) return 'due-soon'; // within 24 hours
  return 'on-track';
};
```

---

## Webpack Configuration

Include the `tables/` directory in your webpack copy configuration so the scripts are packaged with the app:

```javascript
// webpack.config.js
new CopyWebpackPlugin({
  patterns: [
    { from: "app.json",  to: "app.json" },
    { from: "app.png",   to: "app.png",   noErrorOnMissing: true },
    { from: "tables",    to: "tables",    noErrorOnMissing: true }, // ← add this
    { from: "assets",    to: "assets",    noErrorOnMissing: true },
  ]
})
```

Installed scripts are stored at:

```
{storage}/apps/{appId}/tables/{tableName}/{fieldName}/validator.js
{storage}/apps/{appId}/tables/{tableName}/{fieldName}/formula.js
```
