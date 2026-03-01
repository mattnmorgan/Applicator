# Applet Contexts

Applets are the UI entry points for an app. They are declared in the `applets` array of `app.json`. Each applet maps to an exported React component from the app bundle and is mounted by the platform in a specific location.

---

## Declaration

```json
{
  "applets": [
    {
      "id": "main",
      "label": "My App",
      "description": "Main application view",
      "target": "app",
      "component": "Dashboard"
    }
  ]
}
```

## Applet Properties

| Property      | Type     | Required | Description                                                          |
| ------------- | -------- | -------- | -------------------------------------------------------------------- |
| `id`          | `string` | Yes      | Unique identifier within the app                                     |
| `label`       | `string` | Yes      | Display name shown in menus and titles                               |
| `description` | `string` | Yes      | Description shown to users                                           |
| `target`      | `string` | Yes      | Where the applet appears (see targets table below)                   |
| `component`   | `string` | Yes      | Exported component name from the app bundle (`app.js`)               |
| `settings`    | `array`  | No       | Per-instance setting descriptors (supported for `home` target only)  |

---

## Targets

| Target            | Description                                                   | Reference |
| ----------------- | ------------------------------------------------------------- | --------- |
| `app`             | Main application view, accessible from the app launcher      | [app.md](./app.md) |
| `home`            | Widget on each user's home/dashboard screen                   | [home.md](./home.md) |
| `user-settings`   | Panel in the user's personal settings                         | [user-settings.md](./user-settings.md) |
| `system-settings` | Panel in the system-wide admin settings (admin only)          | [system-settings.md](./system-settings.md) |
| `guest`           | Shown to unauthenticated users via a share link               | [guest.md](./guest.md) |

---

## The `context` Prop

Every applet component receives a `context` prop from the platform, typed as `UiContext` from `@applicator/sdk/context`:

```typescript
import { UiContext } from "@applicator/sdk/context";

interface MyAppletProps {
  context?: UiContext;
}
```

```typescript
interface UiContext<T = any> {
  appId: string;    // The app's ID
  path: string[];   // URL path segments after the appId
  guest?: {         // Only present for "guest" target applets
    id: string;
    data: T;
    password: string;
  };
}
```

---

## Settings Descriptors

Applets with `target: "home"` may define `settings` — a list of per-instance configurable fields that users set when they add the widget to their home screen. Values are stored per-user and passed to the component via a `settings` prop.

```json
{
  "id": "my-widget",
  "target": "home",
  "component": "Widget",
  "settings": [
    {
      "name": "theme",
      "label": "Color Theme",
      "type": "picklist",
      "default": "blue",
      "options": { "blue": "Blue", "green": "Green" }
    },
    {
      "name": "maxItems",
      "label": "Maximum Items",
      "type": "number",
      "default": 5
    },
    {
      "name": "showCount",
      "label": "Show Count Badge",
      "type": "boolean",
      "default": true
    }
  ]
}
```

### Setting Descriptor Properties

| Property  | Type     | Required                  | Description                           |
| --------- | -------- | ------------------------- | ------------------------------------- |
| `name`    | `string` | Yes                       | Setting identifier                    |
| `label`   | `string` | Yes                       | Display label shown to the user       |
| `type`    | `string` | Yes                       | `string`, `number`, `boolean`, `picklist`, or `multipicklist` |
| `default` | `any`    | No                        | Default value                         |
| `options` | `object` | For `picklist`/`multipicklist` | Map of value to display label    |
