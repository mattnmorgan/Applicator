# ProfileIndicator

Displays a user's avatar (or first-letter placeholder) with their display name.

```typescript
import { ProfileIndicator } from "@applicator/sdk/components";
```

## Props

| Prop             | Type     | Default  | Description          |
| ---------------- | -------- | -------- | -------------------- |
| `displayName`    | `string` | required | User's display name  |
| `profilePicture` | `string` | -        | URL to profile image |

## Usage

```tsx
<ProfileIndicator displayName="John Doe" />
<ProfileIndicator displayName="Jane" profilePicture="/api/my-app/assets/avatar.png" />
```
