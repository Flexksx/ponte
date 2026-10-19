import { describe, expect, it } from "bun:test";
import {
  parseClaudeSession,
  parsePiSession,
} from "../src/infra/agent-sessions";

const lines = (...records: object[]): string =>
  records.map(record => JSON.stringify(record)).join("\n");

describe("parseClaudeSession", () => {
  it("takes the folder from the transcript and skips harness messages for the title", () => {
    const text = lines(
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
    expect(parseClaudeSession("abc", text)).toEqual({
      agent: "claude-code",
      id: "abc",
      directory: "/home/u/My Notes",
      startedAt: "2026-10-19T08:00:00Z",
      title: "speed up builds",
      resume: "cd '/home/u/My Notes' && claude --resume abc",
    });
  });

  it("drops a session that has no prompt", () => {
    const text = lines({
      type: "user",
      cwd: "/home/u",
      timestamp: "2026-10-19T08:00:00Z",
      message: { content: "<local-command-stdout></local-command-stdout>" },
      isMeta: true,
    });
    expect(parseClaudeSession("abc", text)).toBeNull();
  });
});

describe("parsePiSession", () => {
  it("reads the session header and the first user message", () => {
    const text = lines(
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
    expect(parsePiSession("/s/p1.jsonl", text)).toEqual({
      agent: "pi-agent",
      id: "p1",
      directory: "/home/u/tech",
      startedAt: "2026-10-15T13:24:06Z",
      title: "I have this set of PRs",
      resume: "cd /home/u/tech && pi --session /s/p1.jsonl",
    });
  });
});
