#!/usr/bin/env node
"use strict";

/**
 * BOSS Companion Status Reporter Hook
 *
 * Claude Code hook that writes BOSS orchestration status to
 * ~/.boss-companion/status.json
 *
 * Adapted from agent-paperclip (MIT) — extended with BOSS-specific states:
 * delegating, reviewing, sprinting, discord
 *
 * Hook events received via stdin as JSON:
 * - UserPromptSubmit: When the user submits a prompt
 * - PreToolUse: Before a tool is used
 * - PostToolUse: After a tool completes
 * - Stop: When Claude stops responding
 * - SubagentStop: When a subagent finishes (BOSS-specific)
 * - SessionStart: When a session starts
 * - SessionEnd: When a session ends
 * - Notification: Permission/elicitation prompts
 */

const { writeFile, readFile, mkdir, rename } = require("fs/promises");
const { existsSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");
const { randomUUID } = require("crypto");

const STATUS_DIR = join(homedir(), ".boss-companion");
const STATUS_FILE = join(STATUS_DIR, "status.json");
const AGENTS_FILE = join(STATUS_DIR, "agents.json");
const EVENTLOOP_FILE = join(STATUS_DIR, "eventloop.json");

// Tool name to human-readable action mapping
const TOOL_ACTIONS = {
  Read: "Reading file...",
  Write: "Writing file...",
  Edit: "Editing code...",
  Bash: "Running command...",
  Glob: "Searching files...",
  Grep: "Searching code...",
  WebFetch: "Fetching web page...",
  WebSearch: "Searching the web...",
  Agent: "Delegating to agent...",
  Task: "Working on subtask...",
  TodoWrite: "Planning tasks...",
  AskUserQuestion: "Has a question for you...",
  ToolSearch: "Discovering tools...",
  Skill: "Running skill...",
};

// Map tool names to BOSS states
const TOOL_STATES = {
  Read: "reading",
  Glob: "reading",
  Grep: "reading",
  WebFetch: "reading",
  WebSearch: "reading",
  Write: "working",
  Edit: "working",
  Bash: "working",
  Task: "working",
  TodoWrite: "working",
  Agent: "delegating",
  Skill: "sprinting",
  ToolSearch: "thinking",
  AskUserQuestion: "waiting",
};

// Persistent agent tracking (each hook invocation is a separate process)
let activeAgents = [];

function loadAgents() {
  try {
    if (existsSync(AGENTS_FILE)) {
      activeAgents = JSON.parse(require("fs").readFileSync(AGENTS_FILE, "utf-8"));
      // Auto-cleanup: remove completed/failed agents older than 2 minutes
      const twoMinAgo = Date.now() - 2 * 60 * 1000;
      const before = activeAgents.length;
      activeAgents = activeAgents.filter(
        (a) => a.state === "running" || a.startedAt > twoMinAgo
      );
      if (activeAgents.length !== before) saveAgents();
    }
  } catch {
    activeAgents = [];
  }
}

function saveAgents() {
  try {
    require("fs").writeFileSync(AGENTS_FILE, JSON.stringify(activeAgents));
  } catch {
    // best effort
  }
}

function readEventLoopPhase() {
  try {
    if (existsSync(EVENTLOOP_FILE)) {
      return JSON.parse(require("fs").readFileSync(EVENTLOOP_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { phase: "idle" };
}

// Serialized write queue to prevent corruption
let writeChain = Promise.resolve();

async function ensureStatusDir() {
  if (!existsSync(STATUS_DIR)) {
    await mkdir(STATUS_DIR, { recursive: true });
  }
}

async function readCurrentStatus() {
  try {
    const content = await readFile(STATUS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Atomic write: write to temp file then rename.
 * Prevents the Electron watcher from reading a half-written file.
 */
async function atomicWriteFile(filePath, data) {
  const tmpFile = `${filePath}.${randomUUID().slice(0, 8)}.tmp`;
  await writeFile(tmpFile, data);
  await rename(tmpFile, filePath);
}

async function writeStatus(state, action, extraFields = {}) {
  const task = writeChain.then(async () => {
    await ensureStatusDir();

    // Merge with current status to preserve fields we don't update
    const current = (await readCurrentStatus()) || {};

    const data = {
      state,
      action,
      agents: activeAgents,
      discord: current.discord || { pending: 0 },
      eventLoop: readEventLoopPhase(),
      tokens: current.tokens || { context: 0, output: 0 },
      timestamp: Date.now(),
      ...extraFields,
    };

    await atomicWriteFile(STATUS_FILE, JSON.stringify(data, null, 2));
  });

  writeChain = task.catch(() => {});
  await task;
}

/**
 * Parse transcript JSONL for token usage (same approach as agent-paperclip)
 */
async function parseTranscriptUsage(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return null;
  }
  try {
    const content = await readFile(transcriptPath, "utf8");
    const lines = content.trim().split("\n");
    let latestContext = 0;
    let latestOutput = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const usage = entry.message?.usage;
        if (usage) {
          latestContext =
            (usage.input_tokens || 0) +
            (usage.cache_creation_input_tokens || 0) +
            (usage.cache_read_input_tokens || 0);
          latestOutput = usage.output_tokens || 0;
        }
      } catch {
        // Skip malformed lines
      }
    }

    if (latestContext === 0 && latestOutput === 0) return null;
    return { context: latestContext, output: latestOutput };
  } catch {
    return null;
  }
}

/**
 * Count pending Discord messages by checking the free-queries directory
 */
function countPendingDiscord() {
  const fqDir = join(homedir(), ".agent", "discord", "free-queries");
  try {
    if (!existsSync(fqDir)) return 0;
    const { readdirSync } = require("fs");
    const files = readdirSync(fqDir);
    // Build a set of read markers (basenames with .read files)
    const readSet = new Set(
      files.filter((f) => f.endsWith(".read")).map((f) => f.replace(".read", ""))
    );
    // Count .txt files that don't have a corresponding .read marker
    const unread = files.filter(
      (f) => f.startsWith("fq_") && f.endsWith(".txt") && !readSet.has(f.replace(".txt", ""))
    );
    return unread.length;
  } catch {
    return 0;
  }
}

/**
 * Read last Discord message preview from most recent free-query file
 */
function getLastDiscordMessage() {
  const fqDir = join(homedir(), ".agent", "discord", "free-queries");
  try {
    if (!existsSync(fqDir)) return undefined;
    const { readdirSync, readFileSync } = require("fs");
    const allFiles = readdirSync(fqDir);
    const readSet = new Set(
      allFiles.filter((f) => f.endsWith(".read")).map((f) => f.replace(".read", ""))
    );
    const unread = allFiles
      .filter((f) => f.startsWith("fq_") && f.endsWith(".txt") && !readSet.has(f.replace(".txt", "")))
      .sort()
      .reverse();
    if (unread.length === 0) return undefined;
    const content = readFileSync(join(fqDir, unread[0]), "utf-8").trim();
    // Return first 80 chars as preview
    return content.length > 80 ? content.slice(0, 80) + "..." : content;
  } catch {
    return undefined;
  }
}

async function handleEvent(event) {
  loadAgents();

  const {
    hook_event_name,
    tool_name,
    tool_input,
    tool_response,
    transcript_path,
  } = event;

  // Parse token usage from transcript
  const tokens = (await parseTranscriptUsage(transcript_path)) || {
    context: 0,
    output: 0,
  };
  const discordPending = countPendingDiscord();
  const lastMessage = getLastDiscordMessage();
  const extraFields = {
    tokens,
    discord: { pending: discordPending, lastMessage },
  };

  switch (hook_event_name) {
    case "UserPromptSubmit": {
      // Processing user input — map to 'discord' state since BOSS
      // primarily receives input via Discord IPC
      const state = discordPending > 0 ? "discord" : "thinking";
      await writeStatus(state, "Processing input...", extraFields);
      break;
    }

    case "PreToolUse": {
      const state = (tool_name && TOOL_STATES[tool_name]) || "working";
      let action =
        (tool_name && TOOL_ACTIONS[tool_name]) || `Using ${tool_name}...`;

      // Add context for specific tools
      if (tool_name === "Read" && tool_input?.file_path) {
        const filename = tool_input.file_path.split("/").pop();
        action = `Reading ${filename}...`;
      } else if (tool_name === "Write" && tool_input?.file_path) {
        const filename = tool_input.file_path.split("/").pop();
        action = `Writing ${filename}...`;
      } else if (tool_name === "Edit" && tool_input?.file_path) {
        const filename = tool_input.file_path.split("/").pop();
        action = `Editing ${filename}...`;
      } else if (tool_name === "Bash" && tool_input?.command) {
        const cmd = tool_input.command.split(" ")[0];
        action = `Running ${cmd}...`;
      } else if (tool_name === "Grep" && tool_input?.pattern) {
        const pat = tool_input.pattern.slice(0, 20);
        action = `Searching for "${pat}${tool_input.pattern.length > 20 ? "..." : ""}"...`;
      } else if (tool_name === "Agent" && tool_input?.description) {
        action = `Delegating: ${tool_input.description.slice(0, 40)}...`;
        // Track this agent (persisted across hook invocations)
        const agentId = `agent-${Date.now()}`;
        activeAgents.push({
          id: agentId,
          description: tool_input.description,
          state: "running",
          startedAt: Date.now(),
        });
        saveAgents();
      } else if (tool_name === "Skill" && tool_input?.skill) {
        action = `Running skill: ${tool_input.skill}`;
      }

      await writeStatus(state, action, extraFields);
      break;
    }

    case "PostToolUse": {
      if (tool_response && tool_response.success === false) {
        await writeStatus("error", "Something went wrong...", extraFields);
      } else {
        // After tool use, BOSS is typically thinking about next action
        await writeStatus("thinking", "Thinking...", extraFields);
      }
      break;
    }

    case "SubagentStop": {
      // Mark the most recent running agent as completed/failed
      const lastRunning = activeAgents.findLast((a) => a.state === "running");
      if (lastRunning) {
        lastRunning.state =
          tool_response?.success === false ? "failed" : "completed";
      }
      // Clean up agents completed more than 5 minutes ago
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      activeAgents = activeAgents.filter(
        (a) => a.state === "running" || a.startedAt > fiveMinAgo
      );
      saveAgents();

      const runningCount = activeAgents.filter(
        (a) => a.state === "running"
      ).length;
      const action =
        runningCount > 0
          ? `Reviewing... (${runningCount} agents active)`
          : "Agent completed. Reviewing...";

      await writeStatus("reviewing", action, extraFields);
      break;
    }

    case "Stop": {
      await writeStatus("done", "All done!", extraFields);
      break;
    }

    case "SessionStart": {
      activeAgents = [];
      saveAgents();
      await writeStatus("idle", "Session started!", extraFields);
      break;
    }

    case "SessionEnd": {
      activeAgents = [];
      saveAgents();
      await writeStatus("idle", "Session ended", extraFields);
      break;
    }

    case "Notification": {
      const { notification_type } = event;
      if (notification_type === "permission_prompt") {
        await writeStatus("waiting", "Needs your permission...", extraFields);
      } else if (notification_type === "elicitation_dialog") {
        await writeStatus("waiting", "Has a question for you...", extraFields);
      }
      break;
    }

    default:
      break;
  }
}

// Read JSON from stdin and process
async function main() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (!input.trim()) {
    process.exit(0);
  }

  try {
    const event = JSON.parse(input);
    await handleEvent(event);
  } catch (err) {
    console.error("Failed to parse event:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Hook error:", err);
    process.exit(1);
  });
}

module.exports = { handleEvent, writeStatus };
