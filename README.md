# BOSS Companion

Desktop monitoring companion for the BOSS orchestration system.

## What it shows

- **Agent states** — real-time status of BOSS and delegated subagents (thinking, delegating, reviewing, sprinting)
- **Discord messages** — pending message count and last message preview
- **Event loop status** — current timeslot, phase, and next scheduled event
- **Token usage** — context and output token counts

## Stack

- Electron + electron-vite
- React 19 + TypeScript
- Chokidar for file watching

## Architecture

The companion reads `~/.boss-companion/status.json`, which is written by a Claude Code hook (`hooks/status-reporter.js`). The hook captures BOSS-specific events including agent delegation, Discord activity, and timeslot transitions.

## Development

```bash
npm install
npm run dev
```

## Hook Installation

Add to your Claude Code hooks configuration (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [{ "command": "node /path/to/boss-companion/hooks/status-reporter.js" }],
    "PostToolUse": [{ "command": "node /path/to/boss-companion/hooks/status-reporter.js" }],
    "UserPromptSubmit": [{ "command": "node /path/to/boss-companion/hooks/status-reporter.js" }],
    "Stop": [{ "command": "node /path/to/boss-companion/hooks/status-reporter.js" }]
  }
}
```

## License

MIT
