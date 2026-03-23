# FilePreview

A full-screen file preview overlay that renders images, PDFs, audio, video, and text files (with optional syntax highlighting). Includes a header with the file name, an actions menu, word-wrap toggle for text, and optional previous/next navigation buttons.

```typescript
import { FilePreview, isPreviewSupported, getPreviewType } from "@applicator/sdk/components";
import type { FilePreviewProps, PreviewAction } from "@applicator/sdk/components";
```

## Props

| Prop            | Type                                              | Default  | Description                                                                                           |
| --------------- | ------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `fileName`      | `string`                                          | required | File name displayed in the header and used for file type detection                                    |
| `filePath`      | `string`                                          | required | Passed as-is to `getPreviewUrl` and `fetchTextContent` — can be any identifier the caller understands |
| `getPreviewUrl` | `(filePath: string) => Promise<string> \| string` | required | Returns a URL for image, PDF, audio, or video preview; may return a blob URL                          |
| `fetchTextContent` | `(filePath: string) => Promise<string>`        | required | Fetches raw text for text file preview                                                                |
| `onClose`       | `() => void`                                      | required | Called when the close button is clicked                                                               |
| `actions`       | `PreviewAction[]`                                 | —        | Optional file actions shown in an Actions (hamburger) menu in the header                              |
| `onPrev`        | `() => void`                                      | —        | Navigate to the previous file; nav buttons appear only when `onPrev` or `onNext` is provided          |
| `onNext`        | `() => void`                                      | —        | Navigate to the next file                                                                             |
| `hasPrev`       | `boolean`                                         | —        | Disables the previous button when `false`                                                             |
| `hasNext`       | `boolean`                                         | —        | Disables the next button when `false`                                                                 |

## Types

```typescript
interface PreviewAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}
```

## Utility exports

```typescript
// Returns the preview type for a file name
getPreviewType(fileName: string): "image" | "text" | "pdf" | "audio" | "video" | "unsupported"

// Returns true if the file can be previewed at all
isPreviewSupported(fileName: string): boolean
```

**Supported extensions:**
- **Image:** jpg, jpeg, png, gif, bmp, webp, svg
- **Text:** txt, md, json, js, ts, tsx, jsx, css, html, xml, log, csv, sql, py, java, c, cpp, h, hpp, cs, yaml, yml, sh, bash, rb, go, rs, php, swift, kt, r, lua, pl, scala, toml, ini, dockerfile, makefile
- **PDF:** pdf
- **Audio:** mp3, ogg, wav
- **Video:** mp4, mkv, mov

## Usage

### Basic preview (no syntax highlighting)

```tsx
const [previewFile, setPreviewFile] = useState<MyFile | null>(null);

const getPreviewUrl = async (filePath: string) => {
  const res = await fetch(`/api/myapp/files/download?path=${filePath}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

const fetchTextContent = async (filePath: string) => {
  const res = await fetch(`/api/myapp/files/download?path=${filePath}`);
  return res.text();
};

{previewFile && (
  <FilePreview
    fileName={previewFile.name}
    filePath={previewFile.path}
    getPreviewUrl={getPreviewUrl}
    fetchTextContent={fetchTextContent}
    onClose={() => setPreviewFile(null)}
    actions={[
      {
        label: "Download",
        icon: <Icon name="download" size={16} />,
        onClick: () => { /* download logic */ },
      },
    ]}
  />
)}
```

### With previous/next navigation

```tsx
const previewableFiles = files.filter(f => isPreviewSupported(f.name));
const previewIndex = previewableFiles.findIndex(f => f.path === previewFile?.path);

{previewFile && (
  <FilePreview
    fileName={previewFile.name}
    filePath={previewFile.path}
    getPreviewUrl={getPreviewUrl}
    fetchTextContent={fetchTextContent}
    onClose={() => setPreviewFile(null)}
    hasPrev={previewIndex > 0}
    hasNext={previewIndex < previewableFiles.length - 1}
    onPrev={() => setPreviewFile(previewableFiles[previewIndex - 1])}
    onNext={() => setPreviewFile(previewableFiles[previewIndex + 1])}
  />
)}
```

### Conditionally showing a preview link

```tsx
{isPreviewSupported(file.name) ? (
  <button onClick={() => setPreviewFile(file)}>{file.name}</button>
) : (
  <span>{file.name}</span>
)}
```

## Notes

- `filePath` is passed through unchanged to `getPreviewUrl` and `fetchTextContent` — use it as any identifier (file system path, attachment ID, URL, etc.)
- Blob URLs returned from `getPreviewUrl` are automatically revoked when the component unmounts or the file changes
- The word-wrap toggle is only shown for text files
- The nav buttons (`<` / `>`) only appear when at least one of `onPrev` or `onNext` is provided
- Syntax highlighting is handled internally using `highlight.js` (bundled with the SDK) — no setup required in the app
