# Icon

Renders a named SVG icon at a specified size. Icons use `currentColor` so they inherit the text color of their parent.

```typescript
import { Icon } from "@applicator/sdk/components";
import type { IconName } from "@applicator/sdk/components";
```

## Props

| Prop   | Type       | Default  | Description                |
| ------ | ---------- | -------- | -------------------------- |
| `name` | `IconName` | required | Icon identifier            |
| `size` | `number`   | `16`     | Width and height in pixels |

## Available Icons

`archive`, `audio`, `bell`, `calendar`, `check`, `chevron-down`, `chevron-up`, `chevron-left`, `chevron-right`, `clipboard`, `close`, `code`, `copy`, `crown`, `download`, `drag`, `edit`, `external-link`, `eye`, `eye-off`, `file`, `folder`, `globe`, `hamburger`, `sandwich`, `image`, `info`, `library`, `link`, `logout`, `move`, `play`, `plus`, `refresh`, `reply`, `search`, `settings`, `spreadsheet`, `square-stop`, `trash`, `upload`, `user`, `users`, `video`, `warning`, `word-wrap`, `list-view`, `grid-view`, `grid-view-small`

## Usage

```tsx
<Icon name="trash" size={16} />
<Icon name="check" />
```
