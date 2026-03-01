# System Settings Context (`target: "system-settings"`)

The `system-settings` target creates a panel in the platform's system-wide settings area. It is only accessible to administrators (`system:admin`).

---

## Declaration

```json
{
  "id": "config",
  "label": "App Configuration",
  "description": "System-wide settings for this app",
  "target": "system-settings",
  "component": "SystemSettingsPanel"
}
```

---

## Component Interface

```typescript
import { UiContext } from "@applicator/sdk/context";

interface Props {
  context?: UiContext;
}

export default function SystemSettingsPanel({ context }: Props) {
  const appId = context?.appId;
  // Use appId to make authenticated API calls to your app's routes
  // ...
}
```

---

## Notes

- Visible only to users with `system:admin`
- Rendered as a panel inside the system settings UI, not as a standalone page
- Does not support `settings` descriptors (no per-instance configuration)
- Typically used to configure global app behavior: default values, integrations, feature flags
