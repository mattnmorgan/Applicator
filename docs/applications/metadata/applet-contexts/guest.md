# Guest Context (`target: "guest"`)

The `guest` target creates an applet that renders for unauthenticated users who arrive via a share link. Only one guest applet per app is used — if multiple are declared, the first is selected.

For the full guest access implementation guide (creating share links, contextual authorities, password protection), see [Guest Access](../../guest-access.md).

---

## Prerequisites

The app must have `system:guest-accessible` granted to its `app-specific:{appId}` authority. Declare it in `requiredPermissions` to ensure it is always present:

```json
{
  "requiredPermissions": ["system:guest-accessible"]
}
```

See [Required Permissions](../permissions/required.md).

---

## Declaration

```json
{
  "id": "viewer",
  "label": "Shared Viewer",
  "description": "View shared content without logging in",
  "target": "guest",
  "component": "GuestViewer"
}
```

---

## Component Interface

```typescript
import { UiContext } from "@applicator/sdk/context";

interface Props {
  context?: UiContext<{ documentId: string; viewMode: string }>;
}

export default function GuestViewer({ context }: Props) {
  const appId        = context?.appId;
  const contextId    = context?.guest?.id;       // contextual authority ID
  const contextData  = context?.guest?.data;     // parsed JSON from the authority's context field
  const guestPassword = context?.guest?.password; // password used to unlock (empty string if none)
}
```

The generic type parameter on `UiContext<T>` types the `guest.data` field. Pass the shape of whatever JSON you stored in the contextual authority's `context` field when the share link was created.

---

## Making API Calls

Guest applets must pass the contextual authority ID (and optionally the password) as headers on every API request. The platform uses these to authenticate the guest:

```typescript
const headers: Record<string, string> = {
  "X-Guest-Context": contextId!,
};
if (guestPassword) {
  headers["X-Guest-Password"] = guestPassword;
}

const response = await fetch(`/api/${appId}/my-route`, { headers });
```

### Detecting Guest Requests in API Handlers

```typescript
import { ApiContext } from "@applicator/sdk/context";

export async function GET(req: NextRequest, context: ApiContext) {
  if (context.isGuest) {
    const guestCtx = context.contextGuest;
    // guestCtx.id       — contextual authority ID
    // guestCtx.data     — parsed context data
    // guestCtx.password — password used (if any)
  }
}
```

---

## Guest URL Format

```
/guest/{appId}?context={contextualAuthorityId}
```

The platform validates the context ID, checks that the app has `system:guest-accessible`, prompts for a password if required, then renders the guest applet with the populated `context` prop.
