import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { homedir } from "os";
import { readFile, unlink, readdir } from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { handleEvent, writeStatus } = require("../status-reporter.cjs");

const STATUS_DIR = join(homedir(), ".boss-companion");
const STATUS_FILE = join(STATUS_DIR, "status.json");

async function readStatusFile() {
  const content = await readFile(STATUS_FILE, "utf-8");
  return JSON.parse(content);
}

describe("status-reporter", () => {
  beforeEach(async () => {
    try {
      await unlink(STATUS_FILE);
    } catch {
      // File may not exist
    }
  });

  afterEach(async () => {
    try {
      await unlink(STATUS_FILE);
    } catch {
      // Cleanup
    }
  });

  describe("writeStatus", () => {
    it("writes a valid status.json", async () => {
      await writeStatus("idle", "Test action");
      const status = await readStatusFile();
      expect(status.state).toBe("idle");
      expect(status.action).toBe("Test action");
      expect(status.timestamp).toBeGreaterThan(0);
      expect(Array.isArray(status.agents)).toBe(true);
    });

    it("atomic write does not leave temp files", async () => {
      await writeStatus("working", "Testing atomic");
      const files = await readdir(STATUS_DIR);
      const tmpFiles = files.filter((f) => f.endsWith(".tmp"));
      expect(tmpFiles.length).toBe(0);
    });
  });

  describe("handleEvent - PreToolUse", () => {
    it("maps Agent tool to delegating state", async () => {
      await handleEvent({
        hook_event_name: "PreToolUse",
        tool_name: "Agent",
        tool_input: { description: "implement feature X" },
      });
      const status = await readStatusFile();
      expect(status.state).toBe("delegating");
      expect(status.action).toContain("Delegating");
    });

    it("maps Bash tool to working state", async () => {
      await handleEvent({
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "npm test" },
      });
      const status = await readStatusFile();
      expect(status.state).toBe("working");
      expect(status.action).toContain("Running npm");
    });

    it("maps Read tool to reading state", async () => {
      await handleEvent({
        hook_event_name: "PreToolUse",
        tool_name: "Read",
        tool_input: { file_path: "/src/app/page.tsx" },
      });
      const status = await readStatusFile();
      expect(status.state).toBe("reading");
      expect(status.action).toContain("page.tsx");
    });

    it("maps Grep tool to reading state", async () => {
      await handleEvent({
        hook_event_name: "PreToolUse",
        tool_name: "Grep",
        tool_input: { pattern: "function.*test" },
      });
      const status = await readStatusFile();
      expect(status.state).toBe("reading");
      expect(status.action).toContain("Searching for");
    });

    it("maps Skill tool to sprinting state", async () => {
      await handleEvent({
        hook_event_name: "PreToolUse",
        tool_name: "Skill",
        tool_input: { skill: "health-check" },
      });
      const status = await readStatusFile();
      expect(status.state).toBe("sprinting");
      expect(status.action).toContain("health-check");
    });

    it("maps unknown tool to working state", async () => {
      await handleEvent({
        hook_event_name: "PreToolUse",
        tool_name: "SomeNewTool",
        tool_input: {},
      });
      const status = await readStatusFile();
      expect(status.state).toBe("working");
    });
  });

  describe("handleEvent - PostToolUse", () => {
    it("sets error state on failure", async () => {
      await handleEvent({
        hook_event_name: "PostToolUse",
        tool_response: { success: false },
      });
      const status = await readStatusFile();
      expect(status.state).toBe("error");
    });

    it("sets thinking state on success", async () => {
      await handleEvent({
        hook_event_name: "PostToolUse",
        tool_response: { success: true },
      });
      const status = await readStatusFile();
      expect(status.state).toBe("thinking");
    });
  });

  describe("handleEvent - lifecycle", () => {
    it("Stop sets done state", async () => {
      await handleEvent({ hook_event_name: "Stop" });
      const status = await readStatusFile();
      expect(status.state).toBe("done");
    });

    it("SessionStart resets to idle", async () => {
      await handleEvent({ hook_event_name: "SessionStart" });
      const status = await readStatusFile();
      expect(status.state).toBe("idle");
      expect(status.action).toBe("Session started!");
    });

    it("SessionEnd resets to idle", async () => {
      await handleEvent({ hook_event_name: "SessionEnd" });
      const status = await readStatusFile();
      expect(status.state).toBe("idle");
      expect(status.action).toBe("Session ended");
    });
  });

  describe("handleEvent - Notification", () => {
    it("permission_prompt sets waiting state", async () => {
      await handleEvent({
        hook_event_name: "Notification",
        notification_type: "permission_prompt",
      });
      const status = await readStatusFile();
      expect(status.state).toBe("waiting");
      expect(status.action).toContain("permission");
    });

    it("elicitation_dialog sets waiting state", async () => {
      await handleEvent({
        hook_event_name: "Notification",
        notification_type: "elicitation_dialog",
      });
      const status = await readStatusFile();
      expect(status.state).toBe("waiting");
      expect(status.action).toContain("question");
    });
  });
});
