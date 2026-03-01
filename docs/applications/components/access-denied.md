# AccessDenied

A full-page access denied message with a "Go Back" button.

```typescript
import { AccessDenied } from "@applicator/sdk/components";
```

## Props

| Prop      | Type     | Default                                             | Description   |
| --------- | -------- | --------------------------------------------------- | ------------- |
| `message` | `string` | `"You do not have permission to access this page."` | Error message |

## Usage

```tsx
if (!hasPermission) {
  return (
    <AccessDenied message="You need the 'manage' permission to access this page." />
  );
}
```
