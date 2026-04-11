# ImageUpload

A self-contained image upload component that reads a user-selected file as a base64 data URL and reports it via a callback. Suitable for any icon or avatar upload flow. Use `onChange` for JSON/base64 API routes, or `onFileSelect` for multipart/FormData routes.

## Import

```tsx
import { ImageUpload } from "@applicator/sdk/components";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| null` | `undefined` | Current preview URL. Can be an existing image URL (e.g. `/api/.../icon`) or a newly selected `data:` URL. |
| `onChange` | `(dataUrl: string \| null) => void` | required | Called with the base64 data URL when a file is selected, or `null` when cleared. |
| `onFileSelect` | `(file: File \| null) => void` | — | Optional. Also called with the raw `File` when selected, or `null` when cleared. Use this when your upload endpoint requires multipart `FormData` rather than a base64 payload. |
| `label` | `string` | — | Optional label rendered above the component. |
| `previewSize` | `number` | `64` | Width and height of the preview thumbnail in pixels. |
| `previewRadius` | `number` | `10` | Border radius of the preview thumbnail in pixels. |

## Usage — JSON / base64 endpoint

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

## Usage — multipart / FormData endpoint

```tsx
const [iconPreview, setIconPreview] = useState<string | null>(
  item.hasIcon ? `/api/myapp/items/${item.id}/icon` : null
);
const [pendingIcon, setPendingIcon] = useState<File | null>(null);

// On save:
if (pendingIcon) {
  const formData = new FormData();
  formData.append("file", pendingIcon);
  await fetch(`/api/myapp/items/${item.id}/icon`, { method: "POST", body: formData });
}

// In JSX:
<ImageUpload
  label="Icon"
  value={iconPreview}
  onChange={setIconPreview}
  onFileSelect={setPendingIcon}
/>
```

## Notes

- The component renders a hidden `<input type="file" accept="image/*">` and reads the selected file with `FileReader.readAsDataURL()`.
- `onChange` always receives a string (`data:image/...;base64,...`) or `null` — never a `File` object.
- `onFileSelect` fires on the same user interaction as `onChange`; both fire together when a file is chosen, and both receive `null` when cleared.
- To distinguish between an existing server URL and a pending new upload, check `value?.startsWith("data:")` before sending to the API.
