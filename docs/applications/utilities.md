# Utilities

The platform provides utility classes for common patterns in app development. Import from `@applicator/sdk/utilities`.

```typescript
import { Debouncer, KeyedDebouncer } from "@applicator/sdk/utilities";
```

---

## Debouncer

Debounces a single callback. Each `schedule` call resets the timer. Use `flush` to save immediately on blur, and `cancel` to discard without invoking.

```typescript
const debouncer = useRef(new Debouncer());

// On change — reset timer
debouncer.current.schedule(() => saveValue(value), 1500);

// On blur — save immediately
debouncer.current.flush();

// On unmount — discard pending
useEffect(() => () => debouncer.current.cancel(), []);
```

### Methods

| Method | Description |
| ------ | ----------- |
| `schedule(fn, delay)` | Schedule `fn` after `delay` ms, cancelling any prior pending call |
| `flush()` | Cancel the timer and invoke the pending `fn` immediately |
| `cancel()` | Cancel the timer without invoking `fn` |

---

## KeyedDebouncer

Like `Debouncer`, but tracks a separate timer per string key. Useful when multiple independent items in a list each need their own debounce (e.g. per-row auto-save).

```typescript
const debouncer = useRef(new KeyedDebouncer());
const listRef = useRef(list);
listRef.current = list;

// On unmount — cancel all pending timers
useEffect(() => {
  const d = debouncer.current;
  return () => d.cancelAll();
}, []);

// On change — reset timer for this item only
debouncer.current.schedule(item.id, () => {
  const current = listRef.current;
  onChange(current.items.map(i => i.id === item.id ? { ...i, text } : i));
}, 1500);

// On blur — save this item immediately
debouncer.current.cancel(item.id); // or flush(item.id) if the fn is stored
onChange(listRef.current.items.map(i => i.id === item.id ? { ...i, text: buffered } : i));
```

> **Stale closure note**: When the debounced callback reads shared state (e.g. a list of items), capture it via a `useRef` that is updated each render (`listRef.current = list`). This ensures the callback always sees the latest value when it fires.

### Methods

| Method | Description |
| ------ | ----------- |
| `schedule(key, fn, delay)` | Schedule `fn` after `delay` ms for `key`, cancelling any prior pending call for that key |
| `flush(key)` | Cancel the timer for `key` and invoke its pending `fn` immediately |
| `cancel(key)` | Cancel the timer for `key` without invoking `fn` |
| `cancelAll()` | Cancel all pending timers — call on component unmount |

---

## img

Browser-only image utilities (requires Canvas, Image, and URL APIs).

```typescript
import { img } from "@applicator/sdk/utilities";
```

### `img.resizeImage(source, width, height, options?)`

Resizes a `File` or `Blob` to the given dimensions using the Canvas API and returns a new `Blob`.

```typescript
const blob = await img.resizeImage(file, 96, 96);
const blob = await img.resizeImage(file, 256, 256, { fit: "contain", format: "image/webp" });
```

**Options:**

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `fit` | `"cover" \| "contain" \| "scale-down"` | `"cover"` | `"cover"` scales and center-crops to fill the exact target size; `"contain"` scales to fit within the target size, letterboxing as needed; `"scale-down"` scales proportionally without upscaling and sets the output canvas to the actual scaled dimensions (no padding) |
| `quality` | `number` (0–1) | `0.85` | Encoding quality. Ignored for `"image/png"` |
| `format` | `"image/jpeg" \| "image/png" \| "image/webp"` | `"image/jpeg"` | Output MIME type |
