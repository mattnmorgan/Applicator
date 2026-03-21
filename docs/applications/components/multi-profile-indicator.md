# MultiProfileIndicator

Displays a group of user avatars stacked together. On hover, the avatars spread apart so each one is fully visible. When the number of users exceeds `maxVisible`, an overflow badge (`+N`) is shown; hovering it reveals the remaining names in a tooltip.

This is a **local component** — it is not part of the `@applicator/sdk/components` package. Copy it from `src/components/MultiProfileIndicator.tsx` (or equivalent) into your app.

```typescript
import MultiProfileIndicator, { ProfileUser } from "./components/MultiProfileIndicator";
```

## Types

```typescript
export interface ProfileUser {
  id: string;
  displayName: string;
  profilePicture?: string;
}
```

## Props

| Prop         | Type            | Default | Description                                              |
| ------------ | --------------- | ------- | -------------------------------------------------------- |
| `users`      | `ProfileUser[]` | required | Ordered list of users to display                        |
| `maxVisible` | `number`        | `3`     | Maximum number of avatars shown before an overflow badge |
| `size`       | `number`        | `28`    | Diameter of each avatar circle in pixels                |

## Behavior

- **Collapsed**: Avatars overlap by ~40% of their diameter, forming a compact stack.
- **Expanded (hover)**: Avatars slide apart with a 150ms CSS transition, separated by a 4px gap.
- **No users**: Renders `null`.
- **Overflow badge**: Shown when `users.length > maxVisible`. Displays `+N` where N is the number of hidden users. Hovering reveals their names in a `Tooltip`.
- **Avatar fallback**: When `profilePicture` is not provided, a circle with the user's first initial is shown. The background color is deterministically derived from the `displayName` string (stable across renders).
- **Tooltip on each avatar**: Each visible avatar has a `Tooltip` showing the user's `displayName` on hover.

## Usage

```tsx
// Basic
<MultiProfileIndicator
  users={[
    { id: "1", displayName: "Alice" },
    { id: "2", displayName: "Bob" },
    { id: "3", displayName: "Carol" },
  ]}
/>

// With profile pictures
<MultiProfileIndicator
  users={assignees.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    profilePicture: u.avatarUrl,
  }))}
  maxVisible={4}
  size={32}
/>

// Larger avatars, more visible before overflow
<MultiProfileIndicator users={teamMembers} maxVisible={5} size={36} />
```

## Color Palette

Avatar placeholder backgrounds are chosen deterministically from this set:

| Color     | Hex       |
| --------- | --------- |
| Blue      | `#3b82f6` |
| Purple    | `#8b5cf6` |
| Green     | `#10b981` |
| Amber     | `#f59e0b` |
| Red       | `#ef4444` |
| Cyan      | `#06b6d4` |
| Pink      | `#ec4899` |

The same `displayName` will always resolve to the same color.

## Dependencies

Uses `Tooltip` from `@applicator/sdk/components`:

```typescript
import { Tooltip } from "@applicator/sdk/components";
```
