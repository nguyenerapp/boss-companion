#!/bin/bash
# setup-hooks.sh — One-command hook registration for BOSS Companion
#
# Makes the companion fully portable: clone the repo, run this script,
# and all Claude Code hooks are wired up automatically.
#
# Usage: bash scripts/setup-hooks.sh
#        (or ./scripts/setup-hooks.sh if executable)

set -euo pipefail

# --- Resolve paths ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPANION_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SETTINGS_FILE="$HOME/.claude/settings.json"
COMPANION_DATA_DIR="$HOME/.boss-companion"
AGENT_COMPLETE_SRC="$COMPANION_DIR/hooks/agent-complete.sh"
AGENT_COMPLETE_DST="$HOME/.claude/hooks/agent-complete.sh"
STATUS_REPORTER="$COMPANION_DIR/hooks/status-reporter.cjs"

# --- Validate prerequisites ---
if [ ! -f "$STATUS_REPORTER" ]; then
  echo "ERROR: hooks/status-reporter.cjs not found at $STATUS_REPORTER"
  echo "       Are you running this from the boss-companion repo root?"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "ERROR: node is required but not found in PATH"
  exit 1
fi

# --- Pick JSON tool (jq preferred, python3 fallback) ---
if command -v jq &>/dev/null; then
  JSON_TOOL="jq"
elif command -v python3 &>/dev/null; then
  JSON_TOOL="python3"
else
  echo "ERROR: Either jq or python3 is required for JSON manipulation"
  exit 1
fi

echo "BOSS Companion Hook Setup"
echo "========================="
echo ""
echo "Companion repo: $COMPANION_DIR"
echo "JSON tool:      $JSON_TOOL"
echo ""

# --- Ensure directories exist ---
mkdir -p "$HOME/.claude/hooks"
mkdir -p "$COMPANION_DATA_DIR"

# --- Initialize settings.json if missing ---
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{"hooks":{}}' > "$SETTINGS_FILE"
  echo "[created]  $SETTINGS_FILE"
else
  echo "[exists]   $SETTINGS_FILE"
fi

# --- Check if a hook command is already registered for a given event ---
# Returns 0 (true) if already present, 1 (false) if not
hook_registered() {
  local event_name="$1"
  local cmd_string="$2"
  local count

  if [ "$JSON_TOOL" = "jq" ]; then
    count=$(jq --arg evt "$event_name" --arg cmd "$cmd_string" '
      (.hooks[$evt] // []) | map(select(.hooks[]?.command == $cmd)) | length
    ' "$SETTINGS_FILE" 2>/dev/null || echo "0")
  else
    count=$(python3 - "$SETTINGS_FILE" "$event_name" "$cmd_string" <<'PYEOF'
import json, sys
settings_file, event_name, cmd_string = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    with open(settings_file, 'r') as f:
        s = json.load(f)
    hooks = s.get('hooks', {}).get(event_name, [])
    count = sum(1 for h in hooks
                if any(x.get('command') == cmd_string for x in h.get('hooks', [])))
    print(count)
except Exception:
    print(0)
PYEOF
    )
  fi

  [ "$count" -gt 0 ]
}

# --- Add a hook entry to settings.json ---
add_hook() {
  local event_name="$1"
  local command_str="$2"
  local matcher="${3:-}"

  if [ "$JSON_TOOL" = "jq" ]; then
    local entry
    if [ -n "$matcher" ]; then
      entry=$(jq -n --arg cmd "$command_str" --arg m "$matcher" \
        '{"matcher": $m, "hooks": [{"type": "command", "command": $cmd}]}')
    else
      entry=$(jq -n --arg cmd "$command_str" \
        '{"hooks": [{"type": "command", "command": $cmd}]}')
    fi

    local tmp
    tmp=$(mktemp)
    jq --arg evt "$event_name" --argjson entry "$entry" '
      .hooks //= {} |
      .hooks[$evt] //= [] |
      .hooks[$evt] += [$entry]
    ' "$SETTINGS_FILE" > "$tmp" && mv "$tmp" "$SETTINGS_FILE"
  else
    python3 - "$SETTINGS_FILE" "$event_name" "$command_str" "$matcher" <<'PYEOF'
import json, sys
settings_file = sys.argv[1]
event_name = sys.argv[2]
command_str = sys.argv[3]
matcher = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None

with open(settings_file, 'r') as f:
    settings = json.load(f)

settings.setdefault('hooks', {})
settings['hooks'].setdefault(event_name, [])

entry = {"hooks": [{"type": "command", "command": command_str}]}
if matcher:
    entry["matcher"] = matcher

settings['hooks'][event_name].append(entry)

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)
PYEOF
  fi
}

# --- Register status-reporter hooks ---
STATUS_CMD="node \"$COMPANION_DIR/hooks/status-reporter.cjs\""
ADDED_COUNT=0
SKIPPED_COUNT=0

# Events that require matcher: "*"
for event in PreToolUse PostToolUse; do
  if hook_registered "$event" "$STATUS_CMD"; then
    echo "[skip]     $event — status-reporter already registered"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  else
    add_hook "$event" "$STATUS_CMD" "*"
    echo "[added]    $event — status-reporter (matcher: *)"
    ADDED_COUNT=$((ADDED_COUNT + 1))
  fi
done

# Events without matcher
for event in SubagentStop UserPromptSubmit Stop Notification; do
  if hook_registered "$event" "$STATUS_CMD"; then
    echo "[skip]     $event — status-reporter already registered"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  else
    add_hook "$event" "$STATUS_CMD"
    echo "[added]    $event — status-reporter"
    ADDED_COUNT=$((ADDED_COUNT + 1))
  fi
done

# --- Copy and register agent-complete.sh ---
AGENT_CMD="bash $HOME/.claude/hooks/agent-complete.sh"

if [ -f "$AGENT_COMPLETE_SRC" ]; then
  cp "$AGENT_COMPLETE_SRC" "$AGENT_COMPLETE_DST"
  chmod +x "$AGENT_COMPLETE_DST"
  echo "[copied]   agent-complete.sh → $AGENT_COMPLETE_DST"

  if hook_registered "SubagentStop" "$AGENT_CMD"; then
    echo "[skip]     SubagentStop — agent-complete.sh already registered"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  else
    add_hook "SubagentStop" "$AGENT_CMD"
    echo "[added]    SubagentStop — agent-complete.sh"
    ADDED_COUNT=$((ADDED_COUNT + 1))
  fi
else
  echo "[warn]     hooks/agent-complete.sh not found in companion repo — skipped"
fi

# --- Summary ---
echo ""
echo "Setup complete!"
echo "  Hooks added:   $ADDED_COUNT"
echo "  Hooks skipped: $SKIPPED_COUNT (already registered)"
echo "  Data dir:      $COMPANION_DATA_DIR"
echo ""
echo "The companion will now receive status updates from Claude Code."
