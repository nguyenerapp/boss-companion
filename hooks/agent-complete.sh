#!/bin/bash
# Hook: SubagentStop — writes completion file to event queue when an agent finishes.
# The event-emitter picks up files from .agent/events/agent-complete/ and emits
# task_complete (P0) events via WebSocket so BOSS gets notified in the event loop.

# Read hook input from stdin
INPUT=$(cat)

# Extract description (sanitized for filename) and type
AGENT_DESC=$(echo "$INPUT" | python3 -c "
import json, sys, re
d = json.load(sys.stdin)
desc = d.get('tool_input', {}).get('description', 'unknown')
# Sanitize for filename: alphanumeric, hyphens, underscores only
print(re.sub(r'[^a-zA-Z0-9_-]', '-', desc)[:40])
" 2>/dev/null || echo "unknown")

AGENT_TYPE=$(echo "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('subagent_type', d.get('agent_type', 'agent')))
" 2>/dev/null || echo "agent")

# Write completion file for event-emitter
COMPLETE_DIR="$HOME/.agent/events/agent-complete"
mkdir -p "$COMPLETE_DIR"

TIMESTAMP=$(date +%s)
FILENAME="${COMPLETE_DIR}/agent-${AGENT_DESC}-${TIMESTAMP}.json"

cat > "$FILENAME" <<EOF
{"agent_id":"${AGENT_DESC}","agent_type":"${AGENT_TYPE}","status":"completed","timestamp":${TIMESTAMP},"description":"Agent completed: ${AGENT_DESC}","summary":"Subagent finished"}
EOF

exit 0
