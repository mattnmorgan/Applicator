# Guest Access

Guest access allows unauthenticated users to interact with your app through shareable links. This is useful for public-facing features like shared documents, public dashboards, or external collaboration.

## Prerequisites

Your app must have `system:guest-accessible` granted to its app-specific authority. Declare it in `requiredPermissions` so it is automatically granted and locked. You also need an applet with `target: "guest"` to define which component renders for guest users.

> **Metadata reference** — for `requiredPermissions` and the `guest` applet target (including the `UiContext` type and guest API headers), see [metadata/applet-contexts/guest.md](./metadata/applet-contexts/guest.md).

---

## How Guest Access Works

### 1. Create a Contextual Authority

Your app creates a contextual authority that encodes what the guest can access:

```typescript
import { ApiContext } from "@applicator/sdk/context";

export async function POST(req: NextRequest, context: ApiContext) {
  const user = await context.user();
  const caManager = context.contextualAuthorityManager;
  const body = await req.json();

  const ca = await caManager.createPasswordContextualAuthority({
    app: "my-app",
    recordId: "share",
    permission: "my-app:view",
    password: body.password,
    createdBy: user.id,
    context: JSON.stringify({
      documentId: body.documentId,
      viewMode: "readonly",
    }),
  });

  return NextResponse.json({
    shareUrl: `/guest/my-app?context=${encodeURIComponent(ca.id)}`,
  });
}
```

### 2. Guest Navigates to the URL

The guest URL format is:

```
/guest/{appId}?context={contextualAuthorityId}
```

The platform handles the entire validation flow:

1. Validates the context ID exists and belongs to the app
2. Verifies the app has `system:guest-accessible` permission
3. Prompts for a password if the contextual authority is password-protected
4. Resolves the guest applet component
5. Loads and renders the app with a `context` prop containing guest data

### 3. Guest Applet Receives Context

Your guest component receives a `context` prop (type `UiContext`) with `context.guest.id`, `context.guest.data`, and `context.guest.password`. See [metadata/applet-contexts/guest.md](./metadata/applet-contexts/guest.md) for the full interface and usage.

---

## Guest API Calls

Guest applets can call your app's API routes. The platform automatically routes guest API requests through a different authentication path.

### How Guest API Routing Works

When a guest makes an API call, the request must include the context ID and optionally the password as headers:

```typescript
// From your guest component
const headers: Record<string, string> = {
  "X-Guest-Context": contextId,
};
if (guestPassword) {
  headers["X-Guest-Password"] = guestPassword;
}

const response = await fetch(`/api/${appId}/my-route`, { headers });
```

### Detecting Guest Context in API Handlers

Your API handlers can check if the request is from a guest:

```typescript
import { ApiContext } from "@applicator/sdk/context";

export async function GET(req: NextRequest, context: ApiContext) {
  if (context.isGuest) {
    // Guest request — access is limited
    const guestContext = context.contextGuest;
    // guestContext.id    — contextual authority ID
    // guestContext.data  — parsed context data
    // guestContext.password — password used (if any)

    return NextResponse.json({ mode: "guest", data: guestContext.data });
  }

  // Authenticated request
  const user = await context.user();
  return NextResponse.json({ mode: "authenticated", userId: user.id });
}
```

---

## Password-Protected Access

When a contextual authority has a password, the platform automatically shows a password form to the guest before loading the app. The flow is:

1. Guest visits the share URL
2. Platform detects password is required
3. Password form is displayed
4. Guest enters password
5. Password is validated against the stored bcrypt hash
6. On success, the app loads with the validated password available in `context.guest.password`

The password is also passed to API handlers when the guest makes requests, so your handlers can verify it if needed.

---

## Validation API

The platform exposes a validation endpoint at:

```
POST /api/guest/{appId}/validate
```

**Request body:**

```json
{
  "contextId": "my-app:share:password:1706000000000",
  "password": "optional-password"
}
```

**Responses:**

- Password required: `{ valid: false, requiresPassword: true }`
- Success: `{ valid: true, contextData: {...}, appletComponent: "GuestViewer", appVersion: "1.0.0" }`
- Invalid link: `404 { error: "Invalid or expired link" }`
- No permission: `403 { error: "This app does not support guest access" }`

---

## Complete Example

### app.json

```json
{
  "id": "my-app",
  "name": "Document Sharing App",
  "version": { "major": 1, "minor": 0, "dev": 0 },
  "author": "Developer",
  "description": "Share documents with guest access",
  "requiredPermissions": ["system:guest-accessible"],
  "authorizations": [
    {
      "id": "view",
      "name": "View Documents",
      "description": "Can view documents"
    },
    {
      "id": "share",
      "name": "Share Documents",
      "description": "Can create share links"
    }
  ],
  "applets": [
    {
      "id": "main",
      "label": "Documents",
      "target": "app",
      "component": "DocumentList",
      "description": "Manage documents"
    },
    {
      "id": "guest",
      "label": "Shared View",
      "target": "guest",
      "component": "GuestViewer",
      "description": "Public document viewer"
    }
  ],
  "apiRoutes": [
    {
      "path": "share/create",
      "method": "POST",
      "description": "Create share link"
    },
    {
      "path": "document/view",
      "method": "GET",
      "description": "View a document"
    }
  ]
}
```

### Guest Component

```typescript
// src/apps/GuestViewer.tsx
import React, { useState, useEffect } from 'react';
import { UiContext } from '@applicator/sdk/context';

interface Props {
  context?: UiContext<{ documentId: string }>;
}

export default function GuestViewer({ context }: Props) {
  const appId = context?.appId;
  const contextId = context?.guest?.id;
  const contextData = context?.guest?.data;
  const guestPassword = context?.guest?.password;

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  const guestHeaders: Record<string, string> = {
    'X-Guest-Context': contextId!,
  };
  if (guestPassword) {
    guestHeaders['X-Guest-Password'] = guestPassword;
  }

  useEffect(() => {
    fetch(`/api/${appId}/document/view?id=${contextData?.documentId}`, {
      headers: guestHeaders,
    })
      .then(res => res.json())
      .then(data => {
        setDocument(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', color: '#f1f5f9' }}>
      <h1>{document.title}</h1>
      <p>{document.content}</p>
    </div>
  );
}
```
