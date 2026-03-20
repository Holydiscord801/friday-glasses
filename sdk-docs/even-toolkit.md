# even-toolkit — Community Design System for G2

> Source: https://github.com/fabioglimb/even-toolkit — archived 2026-03-20
> npm: https://www.npmjs.com/package/even-toolkit
> Demo: https://even-demo.vercel.app
> NOTE: This is a community library, NOT official Even Realities

## Install

```bash
npm install even-toolkit
```

## What's Inside

### `/web` — React Component Library (phone companion app UI)

55+ React components with Tailwind CSS.

```tsx
import { Button, Card, NavBar, ListItem, AppShell, ChatContainer, ChatInput, VoiceInput } from 'even-toolkit/web';
```

**Key components for Friday:**
- `ChatContainer` + `ChatInput` — chat interface on phone side
- `VoiceInput` — mic input UI
- `AppShell` + `NavBar` — app shell with navigation
- `StatCard` + `StatGrid` — dashboard cards

### `/glasses` — G2 Glasses SDK Bridge

```tsx
import { useGlasses } from 'even-toolkit/useGlasses';
import { line, separator } from 'even-toolkit/types';
import { buildActionBar } from 'even-toolkit/action-bar';
```

**Core:** EvenHubBridge, useGlasses hook, useFlashPhase hook
**Display:** DisplayData, DisplayLine, line(), separator(), text-utils, timer-display, canvas-renderer
**Input:** action-map, gestures, keyboard bindings
**Layout:** 576x288px display, text/columns/chart/home page modes, image tiles
**Utilities:** splash screens, PNG encoding, text cleaning, pagination, keep-alive

### `/web/icons` — 191 Pixel-Art Icons

```tsx
import { IcChevronBack, IcTrash, IcSettings } from 'even-toolkit/web/icons/svg-icons';
```

Categories: Edit & Settings (32), Feature & Function (50), Guide System (20), Menu Bar (8), Navigate (23), Status (54), Health (12)

## Design Tokens

```css
@import "even-toolkit/web/theme-light.css";
@import "even-toolkit/web/typography.css";
@import "even-toolkit/web/utilities.css";
```

| Token | Value | Usage |
|-------|-------|-------|
| `--color-text` | #232323 | Primary text |
| `--color-positive` | #4BB956 | Success/connected |
| `--color-negative` | #FF453A | Error/warning |
| `--font-display` | FK Grotesk Neue | Display font |

## Real Apps Built With This Toolkit

| App | URL |
|-----|-----|
| EvenDemo (component showcase) | https://even-demo.vercel.app |
| EvenMarket (stock market data on glasses) | https://even-market.vercel.app |
| EvenKitchen (recipes step by step) | https://even-kitchen.vercel.app |
| EvenWorkout (workout tracking) | https://even-workout.vercel.app |
| EvenBrowser (text web browser on glasses) | https://even-browser.vercel.app |

## Quick Start

```tsx
import { AppShell, NavBar, ScreenHeader, Card } from 'even-toolkit/web';

export function App() {
  return (
    <AppShell header={<NavBar items={tabs} activeId={tab} onNavigate={setTab} />}>
      <Card>Hello from Even Toolkit</Card>
    </AppShell>
  );
}
```

## Why This Matters for Friday

The `useGlasses` hook + `ChatContainer` + `VoiceInput` is basically the entire Friday glasses integration pre-built. When Even opens up the AI extension API we discussed in Discord, this toolkit is how we build fast.
