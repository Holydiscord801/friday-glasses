# Device APIs

## Audio

- `bridge.audioControl(true/false)` – open/close microphone
- Requires `createStartUpPageContainer` to be called first
- PCM data arrives via `onEvenHubEvent` as `audioEvent.audioPcm` (`Uint8Array`)
- PCM format: 16kHz sample rate, 10ms frame length (dtUs 10000), 40 bytes per frame, PCM S16LE (signed 16-bit little-endian), mono

## Device info

```typescript
const device = await bridge.getDeviceInfo()
// device.model – DeviceModel.G1 | DeviceModel.G2 | DeviceModel.Ring1
// device.sn – serial number (string)
// device.status.connectType – DeviceConnectType (none/connecting/connected/disconnected/connectionFailed)
// device.status.batteryLevel – 0-100
// device.status.isWearing – boolean
// device.status.isCharging – boolean
// device.status.isInCase – boolean
```

Real-time monitoring via `bridge.onDeviceStatusChanged(callback)`. Returns an unsubscribe function.

## User info

```typescript
const user = await bridge.getUserInfo()
// user.uid – number
// user.name – string
// user.avatar – string (URL)
// user.country – string
```

## Local storage

Key-value storage persisted on the phone side:

```typescript
await bridge.setLocalStorage('key', 'value') // returns boolean
const value = await bridge.getLocalStorage('key') // returns string
```

## What the SDK does NOT expose

- No direct BLE access
- No arbitrary pixel drawing – limited to list/text/image container model
- No audio output (no speaker on hardware)
- No text alignment (no centre, right-align)
- No font size, weight, or family control
- No background colour or fill on containers
- No per-item styling in lists
- No programmatic scroll position control
- No animations or transitions
- Image containers are greyscale only (4-bit, 16 levels)

> Source: https://github.com/nickustinov/even-g2-notes — archived 2026-03-20
