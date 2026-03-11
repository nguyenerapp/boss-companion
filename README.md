# BOSS Companion

Desktop monitoring companion for the BOSS orchestration system. Displays real-time status of Claude Code's BOSS agent as a small always-on-top overlay window with character animations, agent tracking, Discord message counts, and event loop phase indicators.

## What It Shows

- **Agent state** -- real-time BOSS status with visual character (thinking, delegating, reviewing, sprinting, discord, working, reading, idle, waiting, done, error)
- **Active subagents** -- list of delegated agents with elapsed time and running/completed/failed indicators
- **Discord messages** -- pending unread message count with pulse animation on new arrivals
- **Event loop phase** -- current timeslot, phase (work_hours/off_hours/weekend), and upcoming slot timeline
- **Token usage** -- context and output token counts from the active session
- **Stale detection** -- visual "Stale / Disconnected" indicator when no status update has arrived in 5+ minutes

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Claude Code Hooks (status-reporter.cjs)            │
│  Events: PreToolUse, PostToolUse, UserPromptSubmit, │
│          SubagentStop, Stop, Notification            │
└──────────────────────┬──────────────────────────────┘
                       │ writes JSON
                       ▼
           ~/.boss-companion/status.json
                       │
                       │ chokidar file watcher
                       ▼
┌──────────────────────────────────────────────────────┐
│  Electron Main Process (src/main/index.ts)           │
│  - Watches status.json for changes/deletions         │
│  - Manages transparent frameless window              │
│  - System tray with context menu                     │
│  - IPC bridge to renderer                            │
└──────────────────────┬───────────────────────────────┘
                       │ IPC
                       ▼
┌──────────────────────────────────────────────────────┐
│  Preload (src/preload/index.ts)                      │
│  - contextBridge.exposeInMainWorld('electronAPI')    │
│  - Typed IPC for status, preferences, drag, resize   │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  React Renderer (src/renderer/)                      │
│  - BossCharacter / DuckCharacter / MemePackCharacter │
│  - AgentPanel, EventLoopPanel, DiscordBadge          │
│  - ErrorBoundary wrapping the entire app             │
│  - 5 display modes: css-art, call-duck, meme-pack,  │
│    emoji, minimal                                    │
└──────────────────────────────────────────────────────┘
```

### Hooks

| Hook File | Trigger | Purpose |
|-----------|---------|---------|
| `hooks/status-reporter.cjs` | PreToolUse, PostToolUse, UserPromptSubmit, SubagentStop, Stop, Notification | Writes BOSS state, action, agents, discord count, event loop phase, and token usage to `status.json` |
| `hooks/agent-complete.sh` | SubagentStop | Writes agent completion events to `~/.agent/events/agent-complete/` for the event-emitter daemon |

### State Files

| Path | Contents |
|------|----------|
| `~/.boss-companion/status.json` | Current BOSS state: `{ state, action, agents[], discord, eventLoop, tokens, timestamp }` |
| `~/.boss-companion/agents.json` | Persistent agent tracking across hook invocations (running/completed/failed) |
| `~/.boss-companion/eventloop.json` | Event loop phase info written by external tooling: `{ phase, currentSlot?, nextSlotTime?, upcomingSlots? }` |
| `~/.boss-companion/preferences.json` | User preferences: `{ displayMode, scale }` |

## Prerequisites

- **Node.js** >= 18
- **Electron** (installed as devDependency)
- **Claude Code** with hooks support (the status-reporter hook writes data the companion reads)

## Setup

### 1. Install dependencies

```bash
cd boss-companion
npm install
```

### 2. Register hooks with Claude Code

Run the automated setup script:

```bash
bash scripts/setup-hooks.sh
```

This script:
- Creates `~/.claude/hooks/` and `~/.boss-companion/` directories
- Registers `status-reporter.cjs` for PreToolUse, PostToolUse, UserPromptSubmit, SubagentStop, Stop, and Notification events in `~/.claude/settings.json`
- Copies `agent-complete.sh` to `~/.claude/hooks/` and registers it for SubagentStop
- Skips hooks that are already registered (safe to re-run)
- Works with either `jq` or `python3` for JSON manipulation

### 3. Run the companion

```bash
npm run dev
```

The companion window appears as a small transparent overlay in the bottom-right corner of your screen. It auto-updates as Claude Code processes tools and events.

## Development

```bash
# Development with hot reload
npm run dev

# Development with debug logging (prints status changes to console)
npm run dev:debug

# Build for production
npm run build

# Run production build
npm run start

# Package as distributable
npm run dist:mac

# Run tests
npm test

# Run tests once (no watch)
npm run test:run

# Lint
npm run lint
```

### Project Structure

```
boss-companion/
├── hooks/
│   ├── agent-complete.sh         # SubagentStop hook (event queue writer)
│   ├── status-reporter.cjs       # Main status hook (writes status.json)
│   └── __tests__/                # Hook tests
├── scripts/
│   └── setup-hooks.sh            # One-command hook registration
├── src/
│   ├── main/index.ts             # Electron main process
│   ├── preload/index.ts          # Context bridge (IPC)
│   ├── renderer/
│   │   ├── App.tsx               # Root component
│   │   ├── main.tsx              # React entry + ErrorBoundary
│   │   ├── index.html            # HTML shell with CSP
│   │   ├── components/
│   │   │   ├── BossCharacter.tsx  # CSS art character
│   │   │   ├── DuckCharacter.tsx  # Call duck character
│   │   │   ├── MemePackCharacter.tsx
│   │   │   ├── AgentPanel.tsx     # Active agent list
│   │   │   ├── EventLoopPanel.tsx # Phase/slot display
│   │   │   └── DiscordBadge.tsx   # Unread message indicator
│   │   └── hooks/
│   │       └── useStatus.ts       # Status subscription + stale detection
│   └── shared/
│       ├── types.ts              # TypeScript interfaces
│       └── utils.ts              # Shared formatters and constants
├── electron.vite.config.ts       # Build config
├── tsconfig.json
└── package.json
```

## Configuration

### Display Modes

Right-click the companion window to access the context menu:

| Mode | Description |
|------|-------------|
| CSS Art | Pixel-art style character with state-based animations |
| Call Duck | Rubber duck character variant |
| Meme Pack | Meme-themed character expressions |
| Emoji | Single emoji representing current state |
| Minimal | No character, status text only |

### Size Options

- **Small (0.8x)** -- compact overlay
- **Normal (1.0x)** -- default size
- **Large (1.3x)** -- easier to read

Preferences are persisted to `~/.boss-companion/preferences.json`.

### Window Behavior

- **Drag** -- left-click and drag to reposition
- **Double-click** -- minimize to tray
- **Right-click** -- context menu (display mode, size, reset position, debug, quit)
- **System tray** -- shows current state, show/hide toggle, reset position, quit
- **Always on top** -- stays above other windows
- **Transparent + frameless** -- blends with desktop

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `COMPANION_DEBUG` | Set to `1` to enable debug logging (`npm run dev:debug`) |

## How Status Flows

1. Claude Code fires a hook event (e.g., PreToolUse with tool_name="Agent")
2. `status-reporter.cjs` receives the event JSON on stdin
3. It maps the tool to a BOSS state (`Agent` -> `delegating`) and action (`Delegating: task description...`)
4. It reads Discord pending count from `~/.agent/discord/free-queries/` (unread fq_ files)
5. It reads event loop phase from `~/.boss-companion/eventloop.json`
6. It atomically writes the combined status to `~/.boss-companion/status.json`
7. Chokidar detects the file change in the Electron main process
8. Main process sends the status to the renderer via IPC
9. React re-renders with the new state, character animation, and panel data

If `status.json` is deleted, the watcher resets to the default idle state. If no updates arrive for 5+ minutes, the renderer shows a "Stale / Disconnected" indicator.

## License

MIT
