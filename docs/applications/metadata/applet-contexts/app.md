# App Context (`target: "app"`)

The `app` target creates the main application view, accessible from the platform's app launcher. This is the primary full-page experience for authenticated users.

---

## Declaration

```json
{
  "id": "main",
  "label": "My App",
  "description": "Main application view",
  "target": "app",
  "component": "Dashboard"
}
```

Only one `app`-target applet per app is typically needed. The component is rendered in a full-page frame when the user navigates to the app.

---

## Component Interface

```typescript
import { UiContext } from "@applicator/sdk/context";

interface Props {
  context?: UiContext;
}

export default function Dashboard({ context }: Props) {
  const appId = context?.appId;   // "my-app"
  const path = context?.path;     // URL segments after the appId, e.g. ["settings", "profile"]
  // ...
}
```

The `context.path` array reflects sub-navigation within the app (segments after the app base URL). Use it for client-side routing within the applet.

---

## Notes

- Accessible at `/app/{appId}`
- Requires the user to be authenticated
- Does not support `settings` descriptors
