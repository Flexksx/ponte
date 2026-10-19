import { describe, expect, it } from "bun:test";
import {
  parseClaudeSession,
  parsePiSession,
} from "../src/infra/agent-sessions";

const MODIFIED_AT = "2026-10-19T12:00:00.000Z";

const head = (...records: object[]) => ({
  text: records.map(record => JSON.stringify(record)).join("\n"),
  modifiedAt: MODIFIED_AT,
});

describe("parseClaudeSession", () => {
  it("takes the folder from the transcript and skips harness messages for the title", () => {
    const transcript = head(
      { type: "file-history-snapshot" },
      {
        type: "user",
        cwd: "/home/u/My Notes",
        timestamp: "2026-10-19T08:00:00Z",
        message: { content: "<command-name>/clear</command-name>" },
      },
      {
        type: "user",
        cwd: "/home/u/My Notes",
        timestamp: "2026-10-19T08:01:00Z",
        message: {
          content: [
            {
              type: "text",
              text: "<pasted_content>speed up builds</pasted_content>",
            },
          ],
        },
      },
    );
    expect(parseClaudeSession("abc", transcript)).toEqual({
      agent: "claude-code",
      id: "abc",
      directory: "/home/u/My Notes",
      startedAt: "2026-10-19T08:00:00Z",
      lastActiveAt: MODIFIED_AT,
      title: "speed up builds",
      resume: "cd '/home/u/My Notes' && claude --resume abc",
      mentions: [],
    });
  });

  it("drops a session that has no prompt", () => {
    const transcript = head({
      type: "user",
      cwd: "/home/u",
      timestamp: "2026-10-19T08:00:00Z",
      message: { content: "<local-command-stdout></local-command-stdout>" },
      isMeta: true,
    });
    expect(parseClaudeSession("abc", transcript)).toBeNull();
  });
});

describe("session mentions", () => {
  it("collects ticket keys and pull request references from the prompts only", () => {
    const transcript = head(
      {
        type: "user",
        cwd: "/home/u/tech",
        timestamp: "2026-10-19T08:00:00Z",
        message: {
          content:
            "merge order: tech#2204 then https://github.com/extole/rds/pull/112 for ENG-35025",
        },
      },
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "also memcached#51" }] },
      },
    );
    expect(parseClaudeSession("abc", transcript)?.mentions).toEqual([
      "ENG-35025",
      "rds#112",
      "tech#2204",
    ]);
  });
});

describe("parsePiSession", () => {
  it("reads the session header and the first user message", () => {
    const transcript = head(
      {
        type: "session",
        id: "p1",
        timestamp: "2026-10-15T13:24:06Z",
        cwd: "/home/u/tech",
      },
      { type: "message", message: { role: "system", content: [] } },
      {
        type: "message",
        message: {
          role: "user",
          content: [{ type: "text", text: "I have this set of PRs" }],
        },
      },
    );
    expect(parsePiSession("/s/p1.jsonl", transcript)).toEqual({
      agent: "pi-agent",
      id: "p1",
      directory: "/home/u/tech",
      startedAt: "2026-10-15T13:24:06Z",
      lastActiveAt: MODIFIED_AT,
      title: "I have this set of PRs",
      resume: "cd /home/u/tech && pi --session /s/p1.jsonl",
      mentions: [],
    });
  });
});
