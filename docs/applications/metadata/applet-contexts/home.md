# Home Context (`target: "home"`)

The `home` target creates a widget that authenticated users can add to their personal home/dashboard screen. Multiple instances of the same widget can be added, each with independent settings.

---

## Declaration

```json
{
  "id": "my-widget",
  "label": "Quick View",
  "description": "A configurable home screen widget",
  "target": "home",
  "component": "HomeWidget",
  "settings": [
    {
      "name": "maxItems",
      "label": "Maximum Items",
      "type": "number",
      "default": 5
    },
    {
      "name": "showBadge",
      "label": "Show Badge",
      "type": "boolean",
      "default": true
    },
    {
      "name": "view",
      "label": "View Mode",
      "type": "picklist",
      "default": "compact",
      "options": { "compact": "Compact", "expanded": "Expanded" }
    }
  ]
}
```

## Component Interface

```typescript
import { UiContext } from "@applicator/sdk/context";

interface Props {
  context?: UiContext;
  settings?: Record<string, any>;
  maxHeight?: string;
}

export default function HomeWidget({ context, settings, maxHeight }: Props) {
  const appId = context?.appId;

  const maxItems = settings?.maxItems ?? 5;
  const showBadge = settings?.showBadge ?? true;
  const view = settings?.view ?? "compact";
  // ...
}
```

The `settings` prop contains the per-instance values configured by the user. Always use the `settings` prop (not `context`) for widget configuration; `context` provides only the app identity and path.

---

## System-Injected Props

In addition to `context` and `settings`, the home screen automatically injects the following prop into every widget component:

### `maxHeight`

```typescript
maxHeight?: string
```

A CSS `calc()` string representing the total viewport height minus all fixed chrome — the navigation bar (64 px), the app-navigation tabset (49 px), and the utility bar (32 px, when present). Example value:

```
calc(100vh - 64px - 49px - 32px)
```

Use this to give a scrollable or fixed-height widget a height that fills the visible screen. The value already excludes the system chrome; subtract any additional widget-specific padding before applying it.

```typescript
// Example: fill the available height minus the HomeApplets 24px top + bottom padding
const height = maxHeight ? `calc(${maxHeight} - 48px)` : "100%";

return <div style={{ height, overflow: "hidden" }}>...</div>;
```

`maxHeight` is `undefined` when the widget is rendered outside the home screen (e.g. in a preview or test context), so always provide a sensible fallback.

---

## Settings

See [Applet Contexts Overview — Settings Descriptors](./overview.md#settings-descriptors) for the full settings declaration reference.

Setting values are stored per-user per-instance in the `applet_settings` system table. When the user configures the widget, those values are saved and passed via the `settings` prop each time the component renders.

---

## Notes

- Users add home widgets from the home screen customization UI
- Multiple instances of the same home applet can be placed on the home screen simultaneously, each with distinct settings
- Does not support guest access — requires the user to be authenticated
