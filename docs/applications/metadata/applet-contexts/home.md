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
}

export default function HomeWidget({ context, settings }: Props) {
  const appId = context?.appId;

  const maxItems = settings?.maxItems ?? 5;
  const showBadge = settings?.showBadge ?? true;
  const view = settings?.view ?? "compact";
  // ...
}
```

The `settings` prop contains the per-instance values configured by the user. Always use the `settings` prop (not `context`) for widget configuration; `context` provides only the app identity and path.

---

## Settings

See [Applet Contexts Overview — Settings Descriptors](./overview.md#settings-descriptors) for the full settings declaration reference.

Setting values are stored per-user per-instance in the `applet_settings` system table. When the user configures the widget, those values are saved and passed via the `settings` prop each time the component renders.

---

## Notes

- Users add home widgets from the home screen customization UI
- Multiple instances of the same home applet can be placed on the home screen simultaneously, each with distinct settings
- Does not support guest access — requires the user to be authenticated
