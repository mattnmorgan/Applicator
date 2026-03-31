# ImageUpload

A self-contained image upload component that reads a user-selected file as a base64 data URL and reports it via a callback. Suitable for any icon or avatar upload flow where the caller needs a data URL string (e.g. to send to an API route that accepts `{ iconData: string }`).

## Import

```tsx
import { ImageUpload } from "@applicator/sdk/components";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| null` | `undefined` | Current preview URL. Can be an existing image URL (e.g. `/api/.../icon`) or a newly selected `data:` URL. |
| `onChange` | `(dataUrl: string \| null) => void` | required | Called with the base64 data URL when a file is selected, or `null` when cleared. |
| `label` | `string` | — | Optional label rendered above the component. |
| `previewSize` | `number` | `64` | Width and height of the preview thumbnail in pixels. |
| `previewRadius` | `number` | `10` | Border radius of the preview thumbnail in pixels. |

## Usage

```tsx
const [iconData, setIconData] = useState<string | null>(
  item.hasIcon ? `/api/myapp/items/${item.id}/icon` : null
);

// On save:
if (iconData?.startsWith("data:")) {
  await fetch(`/api/myapp/items/${item.id}/icon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iconData }),
  });
}

// In JSX:
<ImageUpload
  label="Icon"
  value={iconData}
  onChange={setIconData}
/>
```

## Notes

- The component renders a hidden `<input type="file" accept="image/*">` and reads the selected file with `FileReader.readAsDataURL()`.
- `onChange` always receives a string (`data:image/...;base64,...`) or `null` — never a `File` object. This makes it safe to pass directly to API routes that call `.includes(",")` on the value.
- To distinguish between an existing server URL and a pending new upload, check `value?.startsWith("data:")` before sending to the API.
