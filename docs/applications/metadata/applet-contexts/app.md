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

The platform passes props **flat** (not nested under a `context` key):

```typescript
interface Props {
  appId?: string;
  path?: string[];
  navigate?: (url: string) => void;
}

export default function Dashboard({ appId, path = [], navigate }: Props) {
  // path — URL segments after the appId, e.g. ["settings", "profile"]
  // navigate — platform router's push function; use this to update the URL
}
```

### `path`

Reflects sub-navigation within the app (segments after the app base URL). Use it to restore the correct view on initial load when the user arrives via a deep link.

### `navigate`

Calls the platform router's `push` method. Always prefer this over `window.history.pushState` or Next.js's `useRouter` — the applet runs in an isolated React tree and has no access to the router context directly.

```typescript
// Navigating to a deep-link URL
navigate(`/app/my-app/section/${id}`);
```

The `path` prop will reflect the new segments on next mount (e.g. when the user follows a notification link to the same URL).

---

## Notes

- Accessible at `/app/{appId}`
- Requires the user to be authenticated
- Does not support `settings` descriptors
