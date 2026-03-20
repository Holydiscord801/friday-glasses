# UI patterns from real apps

## Fake "buttons" with text cursor

No button widgets exist. Simulate with `>` prefix cursor:

```
> Return
  Delete note
```

Scroll moves `>` between items. Click triggers selected action. Update via `textContainerUpgrade`.

## Progress bars with Unicode

```typescript
const filled = '━'.repeat(n)
const empty = '─'.repeat(total - n)
const bar = filled + empty
```

## Page flipping for long text

Pre-paginate text into ~400-500 char pages at word boundaries. Track `pageIndex`, rebuild on `SCROLL_BOTTOM_EVENT`/`SCROLL_TOP_EVENT`.

## Event capture for image-based apps

Use a hidden full-screen text container (content: `' '`) behind the image to receive all event types.

## Key display limits

- Max 4 containers per page
- Text limit: 1000 chars (startup/rebuild), 2000 chars (upgrade)
- ~400-500 chars fills a full 576x288 screen
- Images: max 200x100px, greyscale only
- No font control, no text alignment, no background colors

> Source: https://github.com/nickustinov/even-g2-notes — archived 2026-03-20
