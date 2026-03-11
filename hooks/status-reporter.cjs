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
  TaskOutput: "Listening for events...",
  TaskStop: "Stopping background task...",
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
  TaskOutput: "waiting",
  TaskStop: "working",
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
      // Auto-cleanup: remove completed/failed agents older than 2 minutes,
      // and remove "running" agents older than 30 minutes (likely missed SubagentStop)
      const twoMinAgo = Date.now() - 2 * 60 * 1000;
      const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
      const before = activeAgents.length;
      activeAgents = activeAgents.filter(
        (a) => {
          if (a.state === "running") return a.startedAt > thirtyMinAgo;
          return a.startedAt > twoMinAgo;
        }
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

/**
 * Write updated event-loop phase to eventloop.json so it persists across
 * hook invocations and is visible to the companion app.
 */
function writeEventLoopPhase(phase, currentSlot) {
  try {
    const data = { phase, currentSlot: currentSlot || "", ts: Math.floor(Date.now() / 1000) };
    const tmpFile = `${EVENTLOOP_FILE}.${randomUUID().slice(0, 8)}.tmp`;
    require("fs").writeFileSync(tmpFile, JSON.stringify(data));
    require("fs").renameSync(tmpFile, EVENTLOOP_FILE);
  } catch {
    // best effort
  }
}

/**
 * Infer the event-loop phase from tool usage context.
 *
 * BOSS cycles: launch event-wait (background) → TaskOutput (blocking wait)
 * → process event → relaunch. The status-reporter fires on each tool call,
 * so we can detect transitions:
 *
 *   TaskOutput           → "waiting"       (blocked on events)
 *   Bash + event-wait    → "launching"     (starting event listener)
 *   Agent                → "delegating"    (spawning subagent)
 *   Read/Write on discord→ "discord"       (processing Discord IPC)
 *   Skill                → "running_skill" (executing a timeslot skill)
 *   Bash + git/gh        → "shipping"      (git operations)
 *   Other tools          → "processing"    (general work)
 */
function inferEventLoopPhase(hookEvent, toolName, toolInput) {
  if (hookEvent === "SessionStart") return { phase: "starting", slot: "" };
  if (hookEvent === "SessionEnd") return { phase: "stopped", slot: "" };
  if (hookEvent === "Stop") return { phase: "idle", slot: "" };
  if (hookEvent === "SubagentStop") return { phase: "reviewing", slot: "" };
  if (hookEvent === "Notification") return { phase: "blocked", slot: "needs input" };

  if (!toolName) return null; // no tool context, keep existing phase

  // TaskOutput = BOSS is blocking on event-wait (the "waiting" state)
  if (toolName === "TaskOutput") return { phase: "waiting", slot: "listening" };

  // Bash commands — inspect the command for context
  if (toolName === "Bash" && toolInput?.command) {
    const cmd = toolInput.command;
    if (cmd.includes("event-wait")) return { phase: "launching", slot: "event-wait" };
    if (cmd.includes("git ") || cmd.includes("gh ")) return { phase: "shipping", slot: "" };
    if (cmd.includes("discord") || cmd.includes("outbox")) return { phase: "discord", slot: "" };
    return { phase: "processing", slot: "" };
  }

  // Agent delegation
  if (toolName === "Agent") {
    const desc = toolInput?.description || "";
    return { phase: "delegating", slot: desc.slice(0, 30) };
  }

  // Skill execution (timeslot skills)
  if (toolName === "Skill") {
    const skill = toolInput?.skill || "";
    return { phase: "running_skill", slot: skill };
  }

  // Discord IPC file access
  if ((toolName === "Read" || toolName === "Write" || toolName === "Edit") && toolInput?.file_path) {
    const fp = toolInput.file_path;
    if (fp.includes("discord") || fp.includes("outbox") || fp.includes("free-queries")) {
      return { phase: "discord", slot: "" };
    }
  }

  // General tool usage = processing
  if (hookEvent === "PreToolUse") return { phase: "processing", slot: "" };

  // PostToolUse = thinking (between tool calls)
  if (hookEvent === "PostToolUse") return { phase: "thinking", slot: "" };

  return null; // no change
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

async function writeStatus(state, action, extraFields = {}, eventLoopOverride = null) {
  const task = writeChain.then(async () => {
    await ensureStatusDir();

    // Merge with current status to preserve fields we don't update
    const current = (await readCurrentStatus()) || {};

    // Use inferred event-loop phase if provided, otherwise read from file
    let eventLoop;
    if (eventLoopOverride) {
      // Merge inferred phase with existing eventloop data (preserve nextSlotTime, upcomingSlots)
      const existing = readEventLoopPhase();
      eventLoop = {
        ...existing,
        phase: eventLoopOverride.phase,
        ...(eventLoopOverride.slot ? { currentSlot: eventLoopOverride.slot } : {}),
        ts: Math.floor(Date.now() / 1000),
      };
      // Persist so subsequent calls without inference still show the latest phase
      writeEventLoopPhase(eventLoop.phase, eventLoop.currentSlot || "");
    } else {
      eventLoop = readEventLoopPhase();
    }

    const data = {
      state,
      action,
      agents: activeAgents,
      discord: current.discord || { pending: 0 },
      eventLoop,
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

  // Infer event-loop phase from current tool context
  const elPhase = inferEventLoopPhase(hook_event_name, tool_name, tool_input);

  // Fast path for SubagentStop — skip expensive transcript parsing and Discord checks.
  // Agent state update is the only thing that matters here.
  const isSubagentStop = hook_event_name === "SubagentStop";

  // Only parse transcript for non-frequent events (skip for PostToolUse and SubagentStop)
  const skipExpensiveOps = isSubagentStop || hook_event_name === "PostToolUse";
  const tokens = skipExpensiveOps
    ? { context: 0, output: 0 }
    : (await parseTranscriptUsage(transcript_path)) || { context: 0, output: 0 };
  const discordPending = skipExpensiveOps ? 0 : countPendingDiscord();
  const lastMessage = skipExpensiveOps ? undefined : getLastDiscordMessage();
  const extraFields = skipExpensiveOps
    ? {} // Preserve existing tokens/discord from status file
    : { tokens, discord: { pending: discordPending, lastMessage } };

  switch (hook_event_name) {
    case "UserPromptSubmit": {
      // Processing user input — map to 'discord' state since BOSS
      // primarily receives input via Discord IPC
      const state = discordPending > 0 ? "discord" : "thinking";
      await writeStatus(state, "Processing input...", extraFields, elPhase);
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

      await writeStatus(state, action, extraFields, elPhase);
      break;
    }

    case "PostToolUse": {
      if (tool_response && tool_response.success === false) {
        await writeStatus("error", "Something went wrong...", extraFields, elPhase);
      } else {
        // After tool use, BOSS is typically thinking about next action
        await writeStatus("thinking", "Thinking...", extraFields, elPhase);
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
      // Clean up agents completed more than 2 minutes ago,
      // and "running" agents older than 30 minutes (missed SubagentStop)
      const twoMinAgo2 = Date.now() - 2 * 60 * 1000;
      const thirtyMinAgo2 = Date.now() - 30 * 60 * 1000;
      activeAgents = activeAgents.filter(
        (a) => {
          if (a.state === "running") return a.startedAt > thirtyMinAgo2;
          return a.startedAt > twoMinAgo2;
        }
      );
      saveAgents();

      const runningCount = activeAgents.filter(
        (a) => a.state === "running"
      ).length;
      const action =
        runningCount > 0
          ? `Reviewing... (${runningCount} agents active)`
          : "Agent completed. Reviewing...";

      await writeStatus("reviewing", action, extraFields, elPhase);
      break;
    }

    case "Stop": {
      await writeStatus("done", "All done!", extraFields, elPhase);
      break;
    }

    case "SessionStart": {
      activeAgents = [];
      saveAgents();
      await writeStatus("idle", "Session started!", extraFields, elPhase);
      break;
    }

    case "SessionEnd": {
      activeAgents = [];
      saveAgents();
      await writeStatus("idle", "Session ended", extraFields, elPhase);
      break;
    }

    case "Notification": {
      const { notification_type } = event;
      if (notification_type === "permission_prompt") {
        await writeStatus("waiting", "Needs your permission...", extraFields, elPhase);
      } else if (notification_type === "elicitation_dialog") {
        await writeStatus("waiting", "Has a question for you...", extraFields, elPhase);
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
