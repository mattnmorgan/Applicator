# Banner

An inline status banner for surfacing contextual messages — errors, warnings, info notices, and success states.

```typescript
import Banner from "@applicator/sdk/components/Banner";
```

## Props

| Prop       | Type                                            | Default  | Description            |
| ---------- | ----------------------------------------------- | -------- | ---------------------- |
| `variant`  | `"info" \| "success" \| "warning" \| "error"`   | `"info"` | Visual style and icon  |
| `children` | `ReactNode`                                     | required | Banner message content |

## Usage

```tsx
<Banner variant="info">
  NTFY is not configured. Contact your administrator.
</Banner>

<Banner variant="success">Profile updated successfully.</Banner>

<Banner variant="warning">
  Regenerating will revoke your current topic.
</Banner>

<Banner variant="error">Failed to save settings. Please try again.</Banner>
```

## Notes

- Renders a leading icon automatically based on `variant` (`info`, `check`, `warning`, `error`).
- Intended for persistent inline feedback. For transient pop-up notifications use `ToastStack` instead.
