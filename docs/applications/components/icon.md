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
| `size` | `number`   | `24`     | Width and height in pixels |

## Available Icons

`bell`, `check`, `chevron-down`, `chevron-up`, `chevron-left`, `chevron-right`, `close`, `copy`, `crown`, `download`, `drag`, `edit`, `external-link`, `eye`, `eye-off`, `file`, `folder`, `info`, `link`, `logout`, `move`, `plus`, `refresh`, `search`, `settings`, `trash`, `upload`, `user`, `users`, `warning`, `word-wrap`

## Usage

```tsx
<Icon name="trash" size={16} />
<Icon name="check" />
```
