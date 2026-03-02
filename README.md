# StreamPad

Transform your Novation Launchpad into a fully configurable macro and automation surface — like a Stream Deck, but with 64+ RGB pads, velocity sensitivity, and MIDI flexibility.

## Features

- **MIDI Engine** – Real-time bidirectional MIDI communication with Launchpad Pro MK2, MK3, Launchpad X, Mini MK3, and MK2
- **Action System** – Map pads to keyboard shortcuts, app launches, system commands, HTTP/WebSocket/OSC calls, and plugin actions
- **Visual Feedback** – Full RGB LED control with color, brightness, animations (pulse, flash, rainbow)
- **Profile System** – Multiple profiles with auto-switch rules based on active window/process
- **Layers & Banks** – Virtual layers per profile, giving access to hundreds of actions per device
- **Input Detection** – Press, release, hold, double/triple-press, velocity, and aftertouch
- **Plugin Architecture** – Extensible with custom plugins for OBS, IDE integration, media control, smart home, etc.
- **Cross-Platform** – Windows, macOS, and Linux via Electron

## Tech Stack

- **Electron** + **React** + **TypeScript** + **Vite**
- **JZZ** for cross-platform MIDI I/O
- Modular architecture: MIDI Engine → Input Detector → Action Executor

## Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # Entry point
│   ├── core/
│   │   └── AppController.ts   # Central orchestrator
│   ├── midi/
│   │   ├── MidiEngine.ts      # MIDI I/O
│   │   └── InputDetector.ts   # Press/hold/multi-tap detection
│   ├── actions/
│   │   └── ActionExecutor.ts  # Action execution
│   ├── led/
│   │   └── LedController.ts   # LED feedback & animation
│   ├── profiles/
│   │   └── ProfileManager.ts  # Profile/layer persistence
│   ├── plugins/
│   │   └── PluginManager.ts   # Plugin loading & execution
│   └── ipc/
│       └── IpcBridge.ts       # Main↔Renderer IPC
├── renderer/              # React GUI
│   ├── App.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── PadGrid.tsx
│   │   ├── DeviceBar.tsx
│   │   └── Sidebar.tsx
│   └── styles/
├── shared/                # Shared types & device descriptors
│   ├── types.ts
│   └── devices.ts
└── preload.ts             # Electron preload / context bridge
```

## Getting Started

```bash
# Install dependencies
npm install

# Development (main + renderer)
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist
```

## Creating Plugins

Place plugins in the `userData/plugins/` directory. Each plugin is a folder containing:

- `manifest.json` – Plugin metadata and action definitions
- `index.js` – Main entry point exporting `initialize()`, `executeAction(actionId, params)`, and `shutdown()`

## License

MIT
