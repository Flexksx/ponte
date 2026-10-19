import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  type AgentSession,
  extractMentions,
  type ListAgentSessions,
  type Platform,
  vendorRoot,
} from "@ponte/core";
import { directoryExists } from "./filesystem";

type TranscriptRecord = { readonly [key: string]: unknown };

export type TranscriptHead = {
  readonly text: string;
  readonly modifiedAt: string;
};

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
  if (isHarnessText(text)) {
    return null;
  }
  const title = text
    .trimStart()
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

const isHarnessText = (text: string): boolean => {
  const trimmed = text.trimStart();
  return HARNESS_TEXT_PREFIXES.some(prefix => trimmed.startsWith(prefix));
};

const promptMentions = (
  records: readonly TranscriptRecord[],
  isPrompt: (record: TranscriptRecord) => boolean,
): string[] =>
  extractMentions(
    records
      .filter(isPrompt)
      .map(record => textOf(messageOf(record)?.content))
      .filter(text => !isHarnessText(text))
      .join("\n"),
  );

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

const isClaudePrompt = (record: TranscriptRecord): boolean =>
  record.type === "user" &&
  record.isMeta !== true &&
  record.isSidechain !== true;

const isPiPrompt = (record: TranscriptRecord): boolean =>
  record.type === "message" && messageOf(record)?.role === "user";

export const parseClaudeSession = (
  id: string,
  head: TranscriptHead,
): AgentSession | null => {
  const records = parseRecords(head.text);
  const located = records.find(
    record =>
      stringField(record, "cwd") !== null &&
      stringField(record, "timestamp") !== null,
  );
  const title = firstTitle(records, isClaudePrompt);
  if (located === undefined || title === null) {
    return null;
  }
  const directory = stringField(located, "cwd") ?? "";
  return {
    agent: "claude-code",
    id,
    directory,
    startedAt: stringField(located, "timestamp") ?? "",
    lastActiveAt: head.modifiedAt,
    title,
    resume: `cd ${shellQuote(directory)} && claude --resume ${id}`,
    mentions: promptMentions(records, isClaudePrompt),
  };
};

export const parsePiSession = (
  file: string,
  head: TranscriptHead,
): AgentSession | null => {
  const records = parseRecords(head.text);
  const header = records.find(record => record.type === "session");
  const title = firstTitle(records, isPiPrompt);
  if (header === undefined || title === null) {
    return null;
  }
  const directory = stringField(header, "cwd") ?? "";
  return {
    agent: "pi-agent",
    id: stringField(header, "id") ?? file,
    directory,
    startedAt: stringField(header, "timestamp") ?? "",
    lastActiveAt: head.modifiedAt,
    title,
    resume: `cd ${shellQuote(directory)} && pi --session ${shellQuote(file)}`,
    mentions: promptMentions(records, isPiPrompt),
  };
};

const readHead = async (file: string): Promise<TranscriptHead | null> => {
  try {
    const transcript = Bun.file(file);
    return {
      text: await transcript.slice(0, HEAD_BYTES).text(),
      modifiedAt: new Date(transcript.lastModified).toISOString(),
    };
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
