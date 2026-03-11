#!/bin/bash
# Hook: SubagentStop — writes completion file to event queue when an agent finishes.
# The event-emitter picks up files from .agent/events/agent-complete/ and emits
# task_complete (P0) events via WebSocket so BOSS gets notified in the event loop.
#
# Optimized: single python3 call instead of two, with fallback to defaults.

# Read hook input from stdin
INPUT=$(cat)

# Single python3 call to extract both fields
PARSED=$(echo "$INPUT" | python3 -c "
import json, sys, re
try:
    d = json.load(sys.stdin)
    desc = d.get('tool_input', {}).get('description', 'unknown')
    safe_desc = re.sub(r'[^a-zA-Z0-9_-]', '-', desc)[:40]
    agent_type = d.get('subagent_type', d.get('agent_type', 'agent'))
    safe_type = re.sub(r'[^a-zA-Z0-9_-]', '-', str(agent_type))[:30]
    print(f'{safe_desc}|{safe_type}')
except:
    print('unknown|agent')
" 2>/dev/null || echo "unknown|agent")

AGENT_DESC="${PARSED%%|*}"
AGENT_TYPE="${PARSED##*|}"

# Write completion file for event-emitter
COMPLETE_DIR="$HOME/.agent/events/agent-complete"
mkdir -p "$COMPLETE_DIR"

TIMESTAMP=$(date +%s)
FILENAME="${COMPLETE_DIR}/agent-${AGENT_DESC}-${TIMESTAMP}.json"

cat > "$FILENAME" <<EOF
{"agent_id":"${AGENT_DESC}","agent_type":"${AGENT_TYPE}","status":"completed","timestamp":${TIMESTAMP},"description":"Agent completed: ${AGENT_DESC}","summary":"Subagent finished"}
EOF

exit 0
