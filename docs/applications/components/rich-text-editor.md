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

| Button           | Keyboard shortcut | Function                                              |
| ---------------- | ----------------- | ----------------------------------------------------- |
| **B**            | Ctrl+B            | Bold                                                  |
| *I*              | Ctrl+I            | Italic                                                |
| U̲                | Ctrl+U            | Underline                                             |
| ~~S~~            | Ctrl+Shift+X      | Strikethrough                                         |
| Bullet list      | —                 | Unordered list                                        |
| Numbered list    | —                 | Ordered list                                          |
| Align left       | —                 | Left-align the current block                          |
| Align center     | —                 | Center-align the current block                        |
| Align right      | —                 | Right-align the current block                         |
| Justify          | —                 | Full-justify the current block                        |
| A                | —                 | Font color (opens native OS color picker)             |
| Link             | Ctrl+K            | Insert link — shows inline URL + display text inputs  |
| Image            | —                 | Opens a file picker; inserts a compressed JPEG image  |
| Table            | —                 | Opens row/col picker and inserts an HTML table        |
| Font size +     | —                 | Increases font size of the selection by 2 px  |
| Font size −     | —                 | Decreases font size of the selection by 2 px  |
| Highlight color | —                 | Applies background highlight to selected text  |
| Background color| —                 | Sets background color of the editor area or the current table cell when in a table |

## Table context toolbar

When the caret is inside a table, a second toolbar row appears with table-specific operations:

| Button              | Function                                                        |
| ------------------- | --------------------------------------------------------------- |
| Insert row above    | Inserts a blank row above the row containing the caret          |
| Insert row below    | Inserts a blank row below the row containing the caret          |
| Delete row          | Removes the row containing the caret; deletes the table if last |
| Insert col left     | Inserts a blank column to the left of the caret column          |
| Insert col right    | Inserts a blank column to the right of the caret column         |
| Delete col          | Removes the caret column; deletes the table if last             |
| Toggle header row   | Converts the caret row between `<th>` and `<td>` cells          |
| Toggle header col   | Converts the caret column between `<th>` and `<td>` cells       |
| Toggle header cell  | Converts the current cell between `<th>` and `<td>`             |
| Delete table        | Removes the entire table                                        |

## Image handling

**Insertion** — clicking the image button opens a file picker. Pasting or dropping an image file also works.

**Compression** — all inserted images are resized to a maximum of 800 px wide and re-encoded as JPEG at quality 0.82 using an offscreen `<canvas>` before being embedded as a base64 data URL. This keeps the HTML payload reasonable even for large screenshots.

**Resizing** — clicking an image inside the editor selects it (blue outline). Four corner drag handles appear; dragging any corner adjusts the image width (height tracks automatically via `height: auto`). Press Escape or click elsewhere to deselect.

## Column resize

Hovering near a column border in a table changes the cursor to `col-resize`. Dragging resizes the two adjacent columns as percentage widths. Dragging the right edge of a cell adjusts that cell's column and the column to its right; dragging the left edge adjusts it and the column to its left. Column widths are stored as percentages with `table-layout: fixed` applied to the table element.

## Image resize

Clicking a selected image displays **eight** drag handles: four corner handles (NW, NE, SE, SW) and four edge handles (N, S, E, W).

- **Corner handles** — resize both width and height simultaneously.
- **Left / right edge handles** — resize width only; height follows `height: auto` (or the previously locked height).
- **Top / bottom edge handles** — resize height only; width is unchanged.

## Auto-list detection

Typing a list marker at the start of a line followed by Space automatically converts the line into a list item:

| Marker | Result          |
| ------ | --------------- |
| `- `   | Unordered list  |
| `* `   | Unordered list  |
| `1. `  | Ordered list    |
| `1) `  | Ordered list    |

## DynamicInput integration

`RichTextEditor` is also available as a `DynamicInput` field type (`"richtext"`):

```typescript
{
  id: "notes",
  label: "Notes",
  type: "richtext",
  placeholder: "Add notes...",
}
```

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
- When the editor is empty (no visible text, images, or tables), `onChange` emits `""` rather than raw browser placeholder markup like `<br>`.
- Importing `RichTextEditor` or `RichTextViewer` automatically injects a small `<style>` block into `document.head` that styles lists, links, paragraphs, tables, and images inside `.rte-content` and `.rte-editor` elements. This happens once per page load.
- Table operations mutate the DOM directly rather than using `execCommand`.
- Image data is stored inline as base64 JPEG data URLs in the emitted HTML string.
- `RichTextEditor` uses `document.execCommand` for text formatting, which is deprecated but remains fully supported in all major browsers.
