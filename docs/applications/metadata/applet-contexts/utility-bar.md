# Utility Bar Context (`target: "utility-bar"`)

The `utility-bar` target places an applet into the user's persistent utility bar — a fixed right-side sidebar that is always visible on the home screen. Users choose which utility applets appear in their bar from Homescreen Settings.

---

## Declaration

```json
{
  "id": "my-tool",
  "label": "My Tool",
  "description": "A utility tool always available in the sidebar",
  "target": "utility-bar",
  "component": "MyTool",
  "poppable": true,
  "icon": "assets/my-tool-icon.png"
}
```

## Applet Properties

| Property    | Type      | Required | Description |
| ----------- | --------- | -------- | ----------- |
| `id`        | `string`  | Yes      | Unique identifier within the app |
| `label`     | `string`  | Yes      | Display name shown in the bar |
| `description` | `string` | Yes    | Description shown in settings UI |
| `target`    | `string`  | Yes      | Must be `"utility-bar"` |
| `component` | `string`  | Yes      | Exported component name from `app.js` |
| `poppable`  | `boolean` | No       | When `true`, the user can detach the applet into a repositionable floating mini-window. Defaults to `false`. |
| `icon`      | `string`  | No       | Path to a custom icon file within the app's asset bundle (e.g. `"assets/tool-icon.png"`). Falls back to the app's main icon if omitted. |

---

## Component Interface

```typescript
import { UiContext } from "@applicator/sdk/context";

interface Props {
  context?: UiContext;
}

export function MyTool({ context }: Props) {
  const appId = context?.appId; // e.g. "myapp"
  // ...
}
```

Utility bar applets do **not** receive a `settings` prop. Per-instance configuration is not supported for this target.

---

## Icon

If `icon` is specified, it must be a path relative to the versioned app directory within the bundle. The asset is served via:

```
GET /api/{appId}/assets/{icon}
```

If `icon` is omitted, the applet falls back to the app's main icon at `/api/{appId}/assets/icon`.

---

## Poppable Floating Window

When `poppable: true`, the user can click the pop-out button (⇗) in the bar header to detach the applet into a small floating window. The floating window:

- Has a draggable header showing the applet's icon and label
- Provides a **Return to bar** button to re-dock it inline
- Provides a **Close** button to dismiss it for the current session
- Remembers its last position per-user (stored in `{userId}:ui:utilityBarPositions` in the settings table, cleared when the applet is removed from the bar)

Poppable floating windows are **not supported on mobile** — the pop-out button is hidden and the applet always renders inline in the bar.

---

## Access Control

Utility bar applets follow the same authority-based access model as all other applet targets. They appear in the App Access Manager matrix and can be granted to authorities or individual users.

---

## Notes

- Each utility bar applet appears **once** in the bar (no multiple instances)
- Order and visibility are configured per-user in Homescreen Settings → Utility Bar Applets
- The bar density setting (full / name / icon) controls the appearance of each applet's header
- The bar is hidden entirely on mobile viewports (< 768 px)
