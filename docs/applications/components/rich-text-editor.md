# RichTextEditor

A WYSIWYG rich text editor with a formatting toolbar. Stores and emits content as an HTML string. Includes a companion `RichTextViewer` component for rendering saved HTML content.

```typescript
import { RichTextEditor, RichTextViewer } from "@applicator/sdk/components";
import type { RichTextEditorProps, RichTextViewerProps } from "@applicator/sdk/components";
```

## RichTextEditor Props

| Prop          | Type                        | Default | Description                                                         |
| ------------- | --------------------------- | ------- | ------------------------------------------------------------------- |
| `value`       | `string`                    | required | HTML string value                                                  |
| `onChange`    | `(html: string) => void`    | required | Called on every edit with the updated HTML string                  |
| `placeholder` | `string`                    | —       | Placeholder text shown when the editor is empty                    |
| `minHeight`   | `number \| string`          | `80`    | Minimum height of the editable area in pixels or a CSS string      |
| `disabled`    | `boolean`                   | `false` | Disables editing and dims the editor                               |

## RichTextViewer Props

| Prop    | Type                  | Default | Description                              |
| ------- | --------------------- | ------- | ---------------------------------------- |
| `html`  | `string`              | required | HTML string to render                   |
| `style` | `CSSProperties`       | —       | Additional styles on the container      |

## Toolbar

| Button        | Keyboard shortcut   | Function                                             |
| ------------- | ------------------- | ---------------------------------------------------- |
| **B**         | Ctrl+B              | Bold                                                 |
| *I*           | Ctrl+I              | Italic                                               |
| U̲             | Ctrl+U              | Underline                                            |
| ~~S~~         | Ctrl+Shift+X        | Strikethrough                                        |
| Bullet list   | —                   | Unordered list                                       |
| Numbered list | —                   | Ordered list                                         |
| A             | —                   | Font color (opens native OS color picker)            |
| Link          | Ctrl+K              | Insert link — shows inline URL + display text inputs |

## Auto-list detection

Typing a list marker at the start of a line followed by Space automatically converts the line into a list item:

| Marker | Result          |
| ------ | --------------- |
| `- `   | Unordered list  |
| `* `   | Unordered list  |
| `1. `  | Ordered list    |
| `1) `  | Ordered list    |

## Usage

```tsx
"use client";

import { useState } from "react";
import { RichTextEditor, RichTextViewer } from "@applicator/sdk/components";

export default function Example() {
  const [html, setHtml] = useState("");
  const [saved, setSaved] = useState("");

  return (
    <div>
      <RichTextEditor
        value={html}
        onChange={setHtml}
        placeholder="Write something..."
        minHeight={120}
      />
      <button onClick={() => setSaved(html)}>Save</button>

      {saved && (
        <RichTextViewer
          html={saved}
          style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: "1.6" }}
        />
      )}
    </div>
  );
}
```

## Notes

- The `value` prop is used to set the initial content and to sync external changes. The editor only re-renders its content when `value` differs from the last value it emitted, so internal cursor position is preserved during controlled updates.
- When the editor is empty (no visible text), `onChange` emits `""` rather than raw browser placeholder markup like `<br>`.
- Importing `RichTextEditor` or `RichTextViewer` automatically injects a small `<style>` block into `document.head` that styles lists, links, and paragraphs inside `.rte-content` and `.rte-editor` elements. This happens once per page load.
- `RichTextEditor` uses `document.execCommand` internally, which is deprecated but remains fully supported in all major browsers.
