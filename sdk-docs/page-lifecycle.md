# Page lifecycle

## `createStartUpPageContainer`

Must be called **exactly once** at app startup. Establishes the initial page layout.

```typescript
const result = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 2,
    textObject: [textContainer],
    listObject: [listContainer],
  })
)
```

## `rebuildPageContainer`

Replaces the entire page. Primary way to navigate between screens. Causes brief flicker on real hardware.

```typescript
await bridge.rebuildPageContainer(
  new RebuildPageContainer({
    containerTotalNum: 1,
    textObject: [newTextContainer],
  })
)
```

## `textContainerUpgrade`

Updates text in an existing container without rebuilding the whole page. Faster and flicker-free.

```typescript
await bridge.textContainerUpgrade(new TextContainerUpgrade({
  containerID: 1,
  containerName: 'main-text',
  contentOffset: 0,
  contentLength: 50,
  content: 'New content',
}))
```

## `shutDownPageContainer`

```typescript
await bridge.shutDownPageContainer(0) // 0 = immediate exit
await bridge.shutDownPageContainer(1) // 1 = show exit confirmation
```

## `callEvenApp` (escape hatch)

```typescript
import { EvenAppMethod } from '@evenrealities/even_hub_sdk'
const result = await bridge.callEvenApp(EvenAppMethod.GetUserInfo)
// Or undocumented methods:
const result = await bridge.callEvenApp('someNativeMethod', { param: 'value' })
```

> Source: https://github.com/nickustinov/even-g2-notes — archived 2026-03-20
