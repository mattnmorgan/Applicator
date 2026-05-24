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

## ics

ICS formatting primitives for generating RFC 5545-compliant calendar feeds. Suitable for use in API route handlers on both front-end and back-end.

```typescript
import { ics } from "@applicator/sdk/utilities";
```

### `ics.icsEscape(s)`

Escapes backslashes, semicolons, commas, and newlines in a string for safe embedding in an ICS property value.

```typescript
lines.push(ics.icsFoldLine(`SUMMARY:${ics.icsEscape(item.title)}`));
```

### `ics.icsFoldLine(line)`

Folds a line at 75 octets per RFC 5545 §3.1, inserting `\r\n ` at each fold point. Returns the line unchanged if it is already within the limit. Apply to any property line whose value may exceed 75 characters.

```typescript
lines.push(ics.icsFoldLine(`X-WR-CALNAME:${ics.icsEscape(calendarName)}`));
```

### `ics.icsDate(isoStr, allDay)`

Formats an ISO 8601 string as an ICS date or datetime value.

| `allDay` | Output format | Example |
| -------- | ------------- | ------- |
| `true` | `YYYYMMDD` | `20260315` |
| `false` | `YYYYMMDDTHHmmssZ` | `20260315T090000Z` |

```typescript
// All-day event
lines.push(`DTSTART;VALUE=DATE:${ics.icsDate(event.startDate, true)}`);

// Timed event (UTC)
lines.push(`DTSTART:${ics.icsDate(event.startDate, false)}`);
```

### `ics.icsStamp()`

Returns the current UTC moment as a DTSTAMP value (`YYYYMMDDTHHmmssZ`). Call once per calendar generation and reuse the result for all components in that response.

```typescript
const stamp = ics.icsStamp();
// ... for each component:
lines.push(`DTSTAMP:${stamp}`);
```

### `ics.icsUnescape(s)`

Unescapes special characters in an ICS property value. Inverse of `ics.icsEscape`.

```typescript
const summary = ics.icsUnescape(props["SUMMARY"] || "");
```

### `ics.parseICSDate(val, allDay)`

Converts an ICS date or datetime value to an ISO 8601 string. Returns `null` if `val` is absent or unparseable.

| `allDay` | Input format | Output |
| -------- | ------------ | ------ |
| `true` | `YYYYMMDD` | `YYYY-MM-DDT00:00:00.000Z` |
| `false` | `YYYYMMDDTHHmmssZ` | Full ISO string |

```typescript
const allDay = rawStart.includes("VALUE=DATE");
const start = ics.parseICSDate(props["DTSTART"], allDay);
if (!start) return null;
```

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
