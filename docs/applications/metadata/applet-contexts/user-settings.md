# User Settings Context (`target: "user-settings"`)

The `user-settings` target creates a panel in each user's personal settings area. It is accessible to any authenticated user and is intended for per-user preferences and configuration.

---

## Declaration

```json
{
  "id": "preferences",
  "label": "My Preferences",
  "description": "Personal settings for this app",
  "target": "user-settings",
  "component": "UserPreferencesPanel"
}
```

---

## Component Interface

```typescript
import { UiContext } from "@applicator/sdk/context";

interface Props {
  context?: UiContext;
}

export default function UserPreferencesPanel({ context }: Props) {
  const appId = context?.appId;
  // Use appId to make authenticated API calls to your app's routes
  // ...
}
```

---

## Notes

- Visible to all authenticated users
- Rendered as a panel inside the user settings UI, not as a standalone page
- Does not support `settings` descriptors
- Typically used for notification preferences, display options, or personal defaults that are stored per-user via your app's API
