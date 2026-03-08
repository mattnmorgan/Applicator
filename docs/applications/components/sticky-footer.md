# StickyFooter

A sticky footer bar that anchors to the bottom of its scroll container. Useful for keeping action buttons (Save, Cancel) always visible while form content scrolls above.

```typescript
import { StickyFooter } from "@applicator/sdk/components";
```

## Props

| Prop       | Type        | Default | Description                                                                                         |
| ---------- | ----------- | ------- | --------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode` | required | Button(s) or other content to display centered in the footer                                       |
| `bleed`    | `number`    | `0`     | Pixels to extend beyond the parent's padding on each side. Use this when the footer is rendered inside a padded wrapper and you want it to stretch edge-to-edge. |

## Usage

Basic usage inside a scrollable form:

```tsx
<form onSubmit={handleSubmit}>
  {/* ...form fields... */}
  <StickyFooter>
    <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
    <Button type="submit" variant="primary" disabled={saving}>Save</Button>
  </StickyFooter>
</form>
```

When the footer is inside a container with padding (e.g. 20px), use `bleed` to extend the footer edge-to-edge:

```tsx
{/* parent wrapper has padding: 20px */}
<StickyFooter bleed={20}>
  <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
  <Button type="submit" variant="primary">Save</Button>
</StickyFooter>
```

## Behavior

- Uses `position: sticky; bottom: 0` to stick to the bottom of the nearest scrollable ancestor.
- `marginTop: auto` pushes the footer to the bottom when content is shorter than the container.
- `bleed` applies negative `marginLeft`, `marginRight`, and `marginBottom` equal to the given value, and adds the same amount to the horizontal padding so button content stays correctly positioned.
- Children are centered horizontally with a `12px` gap between them.
