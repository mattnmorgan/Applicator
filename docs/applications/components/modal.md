# Modal

A flexible modal dialog with optional header, body, and footer slots separated by borders. Supports closeable behavior (X button + overlay click + Escape key).

```typescript
import { Modal } from "@applicator/sdk/components";
```

## Props

| Prop        | Type        | Default | Description                                                          |
| ----------- | ----------- | ------- | -------------------------------------------------------------------- |
| `children`  | `ReactNode` | required | Body content                                                        |
| `header`    | `ReactNode` | —       | Header slot. When provided, rendered above body with a bottom border |
| `footer`    | `ReactNode` | —       | Footer slot. When provided, rendered below body with a top border    |
| `closeable` | `boolean`   | `false` | Shows an X button in the header and closes on overlay click/Escape  |
| `onClose`   | `() => void`| —       | Required when `closeable` is true                                    |
| `maxWidth`  | `number`    | `600`  | Numeric maximum width of the modal                                   |
| `maxWidthUnit` | `string` | `"px"` | CSS unit for `maxWidth` — e.g. `"px"`, `"%"`, `"vw"`, `"vh"`, `"rem"` |

## Usage

### Basic modal

```tsx
const [show, setShow] = useState(false);

{show && (
  <Modal
    header={<h2>Settings</h2>}
    footer={
      <>
        <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
        <Button variant="primary" onClick={save}>Save</Button>
      </>
    }
    closeable
    onClose={() => setShow(false)}
  >
    <p>Modal body content goes here.</p>
  </Modal>
)}
```

### Body-only modal (no header or footer)

```tsx
{show && (
  <Modal closeable onClose={() => setShow(false)}>
    <p>Simple content without header or footer.</p>
  </Modal>
)}
```

### Non-closeable modal (loading/processing state)

```tsx
{processing && (
  <Modal header={<h2>Processing…</h2>}>
    <p>Please wait while your request is being processed.</p>
  </Modal>
)}
```

## Notes

- Header and footer are only rendered when their prop is provided — passing `undefined` omits the slot and its border entirely
- The footer aligns its content to the right by default — wrap buttons in a `<>` fragment to place multiple side by side
- Body scrolls independently when content exceeds 90vh; header and footer remain fixed
- `closeable` without `onClose` renders no X button and does not dismiss on overlay click
