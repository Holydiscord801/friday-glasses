# Friday — AI-Agnostic Display Layer for Even Realities G2

A proof-of-concept Even Hub plugin that turns Even Realities G2 smart glasses into an AI-agnostic display layer. Instead of app navigation, the glasses surface information from your preferred AI assistant.

## Vision

The glasses should **not** be an app platform. They should be a transparent AI display layer:
1. Pick your AI (Claude, Gemini, ChatGPT, or bring your own)
2. Auth through your existing subscription
3. The AI already knows your calendar, email, context
4. The glasses just display what the AI surfaces

## Screens

| Screen | Description | Wake/Dismiss |
|--------|-------------|--------------|
| **Sleep** | Default dark state. Display off. | Double-tap or wake word to wake |
| **Welcome** | AI provider selection (scroll + click) | First boot only |
| **Main Display** | Time, date, connected AI indicator | Double-tap to sleep |
| **Drawer Menu** | Chat, Teleprompter, Conversation, Settings | Click opens from main; double-click closes |
| **Chat** | Voice-to-text AI conversation | Click to talk; double-click to exit |
| **Teleprompter** | Scrollable presentation notes | Swipe/click to page; double-click to exit |
| **Conversation** | Live transcript + AI notifications | Click toggles recording; double-click to exit |

## Input Mapping

| Gesture | Action |
|---------|--------|
| Single tap | Select / confirm / toggle |
| Double tap | Wake from sleep / dismiss to previous |
| Swipe up | Scroll up / previous item |
| Swipe down | Scroll down / next item |

## Display Constraints (G2 Hardware)

- 576x288 pixels per eye, 4-bit greyscale (16 shades of green)
- Max 4 containers per page (text, list, or image)
- Text: left/top alignment only, no font control
- ~400-500 characters fill a full screen
- Unicode box-drawing and geometric shapes supported
- No emoji, no animations, no background colors

## Setup

```bash
# Install dependencies
npm install

# Start dev server (simulator mode)
npm run dev

# Open http://localhost:3000
# Use keyboard shortcuts to simulate glasses input:
#   Enter     = tap (CLICK_EVENT)
#   Space     = double-tap (DOUBLE_CLICK_EVENT)
#   ArrowUp   = swipe up (SCROLL_TOP_EVENT)
#   ArrowDown = swipe down (SCROLL_BOTTOM_EVENT)
```

## Debug API (Simulator)

Open the browser console:

```js
friday.help()           // Show all commands
friday.wake()           // Simulate wake word
friday.chat("Hello!")   // Simulate AI response (in chat mode)
friday.transcript("Speaker 1", "Let's discuss the roadmap")
friday.notify("Calendar: Meeting in 5 minutes")
friday.getState()       // Inspect current state
```

## Build & Package

```bash
# Production build
npm run build

# Package as .ehpk for Even Hub submission
npm run package
```

The `app.json` manifest configures the plugin metadata for Even Hub distribution.

## Project Structure

```
friday-glasses-app/
  app.json              # Even Hub plugin manifest
  index.html            # Phone-side WebView entry
  src/
    main.ts             # Entry point, boot sequence, debug API
    app.ts              # Central state machine & screen router
    bridge.ts           # Even Hub SDK bridge (real + simulator)
    types.ts            # TypeScript types & initial state
    layout.ts           # Display constants, container builders, Unicode UI
    logger.ts           # Debug logger (console + WebView)
    screens/
      sleep.ts          # Dark/blank sleep state
      welcome.ts        # AI provider selection
      coming-soon.ts    # Placeholder for non-Claude providers
      main-display.ts   # Time/date/status always-on view
      drawer.ts         # Navigation menu
      chat.ts           # AI chat mode
      teleprompter.ts   # Scrollable notes display
      conversation.ts   # Live transcript + notifications
```

## Architecture

```
Even Hub Cloud ─> Phone (Even App + WebView) ─> G2 Glasses (display + input)
                        │
                   friday-glasses-app
                   (runs in WebView)
                        │
              bridge.callEvenApp() ──> Bluetooth ──> Display
              window._listenEvenAppMessage() <── Input events
```

## Integration Points

The app exposes global functions for phone-side code to call:

- `window.fridayWakeWord(word)` — trigger wake word detection
- `window.fridayAIResponse(text)` — push AI response to chat display
- `window.fridayTranscript(speaker, text)` — add transcript line
- `window.fridayNotification(text)` — surface AI notification

## Status

**Proof of concept** — built for the Dan Hu / Even Realities demo.

Currently functional:
- Full navigation flow (sleep → welcome → main → modes)
- Claude/Friday as the active AI provider
- Teleprompter with demo content
- Conversation awareness with demo transcript
- Inactivity auto-sleep

Coming soon:
- Real voice-to-text pipeline (Soniox integration)
- Claude API integration for chat
- Live conversation transcription
- Gemini, ChatGPT, OpenClaw provider backends
- Settings screen (wake word, timeout, AI config)
