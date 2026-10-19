import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type App,
  describeDirectoryMatch,
  describeSessions,
  describeWorkspace,
  type Problem,
  type Result,
} from "@ponte/core";
import { z } from "zod";
import { describeProblem } from "../cli/problems";

type ToolReply = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const SERVER_NAME = "ponte";

const SERVER_VERSION = "0.1.0";

const text = (value: string): ToolReply => ({
  content: [{ type: "text", text: value }],
});

const reply = <T>(
  result: Result<T, Problem>,
  render: (value: T) => string,
): ToolReply =>
  result.ok
    ? text(render(result.value))
    : { ...text(describeProblem(result.error)), isError: true };

const confirm = (summary: string) => (): string => summary;

export const createMcpServer = (app: App): McpServer => {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const workspaces = app.workspaces;
  const name = z
    .string()
    .describe("Workspace name, lowercase words and hyphens");

  server.registerTool(
    "workspace_for_directory",
    {
      description:
        "Load the workspace that links a folder. Call it at the start of a session with your working directory.",
      inputSchema: { directory: z.string().describe("Absolute path") },
    },
    async ({ directory }) => {
      const all = await workspaces.list();
      if (!all.ok) {
        return reply(all, String);
      }
      return reply(await workspaces.forDirectory(directory), matches =>
        describeDirectoryMatch(matches, all.value),
      );
    },
  );

  server.registerTool(
    "workspace_show",
    {
      description: "Show a workspace: goal, next step, links and decisions.",
      inputSchema: { name },
    },
    async args => reply(await workspaces.show(args.name), describeWorkspace),
  );

  server.registerTool(
    "workspace_create",
    {
      description: "Create a workspace for one effort, with its goal.",
      inputSchema: { name, goal: z.string() },
    },
    async args =>
      reply(
        await workspaces.create(args.name, args.goal),
        confirm(`Created workspace ${args.name}.`),
      ),
  );

  server.registerTool(
    "workspace_link",
    {
      description:
        "Add a URL or an absolute folder path to a workspace, with a few words on why it matters. Linking a target again replaces its note.",
      inputSchema: {
        name,
        target: z.string().describe("URL or absolute path"),
        note: z.string().default(""),
      },
    },
    async args =>
      reply(
        await workspaces.link(args.name, args.target, args.note),
        confirm(`${args.name}: linked ${args.target}`),
      ),
  );

  server.registerTool(
    "workspace_unlink",
    {
      description: "Remove a link from a workspace.",
      inputSchema: { name, target: z.string() },
    },
    async args =>
      reply(
        await workspaces.unlink(args.name, args.target),
        confirm(`${args.name}: unlinked ${args.target}`),
      ),
  );

  server.registerTool(
    "workspace_decide",
    {
      description:
        "Record a decision the user made, in one sentence. Today's date is added.",
      inputSchema: { name, text: z.string() },
    },
    async args =>
      reply(
        await workspaces.decide(args.name, args.text),
        confirm(`${args.name}: recorded decision: ${args.text}`),
      ),
  );

  server.registerTool(
    "workspace_next",
    {
      description: "Replace the workspace's next step.",
      inputSchema: { name, text: z.string() },
    },
    async args =>
      reply(
        await workspaces.setNext(args.name, args.text),
        confirm(`${args.name}: next step: ${args.text}`),
      ),
  );

  server.registerTool(
    "workspace_tag",
    {
      description:
        "Add a tag to a workspace, such as work, personal or a company name. Tags are lowercase words and hyphens.",
      inputSchema: { name, tag: z.string() },
    },
    async args =>
      reply(
        await workspaces.tag(args.name, args.tag),
        confirm(`${args.name}: tagged ${args.tag}`),
      ),
  );

  server.registerTool(
    "workspace_untag",
    {
      description: "Remove a tag from a workspace.",
      inputSchema: { name, tag: z.string() },
    },
    async args =>
      reply(
        await workspaces.untag(args.name, args.tag),
        confirm(`${args.name}: untagged ${args.tag}`),
      ),
  );

  server.registerTool(
    "workspace_done",
    {
      description:
        "Mark a workspace done when its effort is finished. A done workspace no longer loads for its folders.",
      inputSchema: { name },
    },
    async args =>
      reply(
        await workspaces.markDone(args.name),
        confirm(`${args.name}: marked done`),
      ),
  );

  server.registerTool(
    "workspace_reopen",
    {
      description: "Make a done workspace active again.",
      inputSchema: { name },
    },
    async args =>
      reply(
        await workspaces.reopen(args.name),
        confirm(`${args.name}: reopened`),
      ),
  );

  server.registerTool(
    "workspace_sessions",
    {
      description:
        "List the Claude Code and pi sessions that ran in a workspace's folders, newest first, each with the command that resumes it.",
      inputSchema: { name },
    },
    async args => reply(await workspaces.sessions(args.name), describeSessions),
  );

  return server;
};
