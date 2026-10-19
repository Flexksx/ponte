import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  type AgentSession,
  type ListAgentSessions,
  type Platform,
  vendorRoot,
} from "@ponte/core";
import { directoryExists } from "./filesystem";

type TranscriptRecord = { readonly [key: string]: unknown };

const HEAD_BYTES = 64 * 1024;

const TRANSCRIPT_EXTENSION = ".jsonl";

const CLAUDE_PROJECTS_DIRECTORY = "projects";

const CLAUDE_SUBAGENT_PREFIX = "agent-";

const PI_SESSIONS_DIRECTORY = "sessions";

const TITLE_LENGTH = 120;

const HARNESS_TEXT_PREFIXES = [
  "<command-",
  "<local-command-",
  "<system-reminder>",
  "<task-notification>",
  "Caveat:",
];

const SHELL_SAFE = /^[\w@%+=:,./-]+$/;

const MARKUP_TAG = /<[^>]+>/g;

const WHITESPACE = /\s+/g;

const shellQuote = (value: string): string =>
  SHELL_SAFE.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;

const parseRecords = (text: string): TranscriptRecord[] =>
  text.split("\n").flatMap(line => {
    try {
      const value: unknown = JSON.parse(line);
      return typeof value === "object" && value !== null
        ? [value as TranscriptRecord]
        : [];
    } catch {
      return [];
    }
  });

const textOf = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map(block =>
      typeof block === "object" &&
      block !== null &&
      block.type === "text" &&
      typeof block.text === "string"
        ? block.text
        : "",
    )
    .join(" ");
};

const titleOf = (text: string): string | null => {
  const trimmed = text.trimStart();
  if (HARNESS_TEXT_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    return null;
  }
  const title = trimmed
    .replace(MARKUP_TAG, " ")
    .replace(WHITESPACE, " ")
    .trim();
  return title === "" ? null : title.slice(0, TITLE_LENGTH);
};

const stringField = (record: TranscriptRecord, key: string): string | null => {
  const value = record[key];
  return typeof value === "string" ? value : null;
};

const messageOf = (record: TranscriptRecord): TranscriptRecord | null => {
  const message = record.message;
  return typeof message === "object" && message !== null
    ? (message as TranscriptRecord)
    : null;
};

const firstTitle = (
  records: readonly TranscriptRecord[],
  isPrompt: (record: TranscriptRecord) => boolean,
): string | null => {
  for (const record of records.filter(isPrompt)) {
    const title = titleOf(textOf(messageOf(record)?.content));
    if (title !== null) {
      return title;
    }
  }
  return null;
};

export const parseClaudeSession = (
  id: string,
  text: string,
): AgentSession | null => {
  const records = parseRecords(text);
  const located = records.find(
    record =>
      stringField(record, "cwd") !== null &&
      stringField(record, "timestamp") !== null,
  );
  const title = firstTitle(
    records,
    record =>
      record.type === "user" &&
      record.isMeta !== true &&
      record.isSidechain !== true,
  );
  if (located === undefined || title === null) {
    return null;
  }
  const directory = stringField(located, "cwd") ?? "";
  return {
    agent: "claude-code",
    id,
    directory,
    startedAt: stringField(located, "timestamp") ?? "",
    title,
    resume: `cd ${shellQuote(directory)} && claude --resume ${id}`,
  };
};

export const parsePiSession = (
  file: string,
  text: string,
): AgentSession | null => {
  const records = parseRecords(text);
  const header = records.find(record => record.type === "session");
  const title = firstTitle(
    records,
    record => record.type === "message" && messageOf(record)?.role === "user",
  );
  if (header === undefined || title === null) {
    return null;
  }
  const directory = stringField(header, "cwd") ?? "";
  return {
    agent: "pi-agent",
    id: stringField(header, "id") ?? file,
    directory,
    startedAt: stringField(header, "timestamp") ?? "",
    title,
    resume: `cd ${shellQuote(directory)} && pi --session ${shellQuote(file)}`,
  };
};

const readHead = async (file: string): Promise<string | null> => {
  try {
    return await Bun.file(file).slice(0, HEAD_BYTES).text();
  } catch {
    return null;
  }
};

const transcriptsIn = async (root: string): Promise<string[]> => {
  if (!(await directoryExists(root))) {
    return [];
  }
  const groups = await Promise.all(
    (await readdir(root)).map(async group => {
      const directory = join(root, group);
      if (!(await directoryExists(directory))) {
        return [];
      }
      return (await readdir(directory))
        .filter(name => name.endsWith(TRANSCRIPT_EXTENSION))
        .map(name => join(directory, name));
    }),
  );
  return groups.flat();
};

const fileId = (file: string): string =>
  (file.split("/").pop() ?? file).slice(0, -TRANSCRIPT_EXTENSION.length);

const readClaudeSessions = async (root: string): Promise<AgentSession[]> => {
  const files = (await transcriptsIn(root)).filter(
    file => !fileId(file).startsWith(CLAUDE_SUBAGENT_PREFIX),
  );
  const sessions = await Promise.all(
    files.map(async file => {
      const head = await readHead(file);
      return head === null ? null : parseClaudeSession(fileId(file), head);
    }),
  );
  return sessions.filter(session => session !== null);
};

const readPiSessions = async (root: string): Promise<AgentSession[]> => {
  const sessions = await Promise.all(
    (await transcriptsIn(root)).map(async file => {
      const head = await readHead(file);
      return head === null ? null : parsePiSession(file, head);
    }),
  );
  return sessions.filter(session => session !== null);
};

export const createListAgentSessions =
  (home: string, platform: Platform): ListAgentSessions =>
  async () => {
    const [claude, pi] = await Promise.all([
      readClaudeSessions(
        join(
          vendorRoot("claude-code", home, platform),
          CLAUDE_PROJECTS_DIRECTORY,
        ),
      ),
      readPiSessions(
        join(vendorRoot("pi-agent", home, platform), PI_SESSIONS_DIRECTORY),
      ),
    ]);
    return [...claude, ...pi];
  };
