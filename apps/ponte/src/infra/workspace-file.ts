import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  collect,
  err,
  ok,
  type Result,
  type Workspace,
  type WorkspaceProblem,
  type WorkspaceStore,
} from "@ponte/core";
import { z } from "zod";
import { directoryExists, readTextFile, writeText } from "./filesystem";

const WORKSPACE_FILE_EXTENSION = ".json";

const JSON_INDENT = 2;

const WORKSPACE_SCHEMA = z.strictObject({
  goal: z.string(),
  next: z.string(),
  links: z.array(z.strictObject({ target: z.string(), note: z.string() })),
  decisions: z.array(z.strictObject({ date: z.string(), text: z.string() })),
});

const invalidFile = (file: string, message: string): WorkspaceProblem => ({
  kind: "invalid-workspace-file",
  file,
  message,
});

const parseJson = (
  file: string,
  text: string,
): Result<unknown, WorkspaceProblem> => {
  try {
    return ok(JSON.parse(text));
  } catch (error) {
    return err(
      invalidFile(file, error instanceof Error ? error.message : String(error)),
    );
  }
};

const decodeWorkspace = (
  name: string,
  file: string,
  text: string,
): Result<Workspace, WorkspaceProblem> => {
  const json = parseJson(file, text);
  if (!json.ok) {
    return json;
  }
  const parsed = WORKSPACE_SCHEMA.safeParse(json.value);
  return parsed.success
    ? ok({ name, ...parsed.data })
    : err(invalidFile(file, z.prettifyError(parsed.error)));
};

const encodeWorkspace = ({ name, ...content }: Workspace): string =>
  `${JSON.stringify(content, null, JSON_INDENT)}\n`;

export const createWorkspaceStore = (directory: string): WorkspaceStore => {
  const fileOf = (name: string): string =>
    join(directory, `${name}${WORKSPACE_FILE_EXTENSION}`);

  const read = async (
    name: string,
  ): Promise<Result<Workspace | null, WorkspaceProblem>> => {
    const file = fileOf(name);
    const text = await readTextFile(file);
    return text === null ? ok(null) : decodeWorkspace(name, file, text);
  };

  const list = async (): Promise<Result<Workspace[], WorkspaceProblem>> => {
    if (!(await directoryExists(directory))) {
      return ok([]);
    }
    const names = (await readdir(directory))
      .filter(file => file.endsWith(WORKSPACE_FILE_EXTENSION))
      .map(file => file.slice(0, -WORKSPACE_FILE_EXTENSION.length))
      .sort();
    const workspaces = collect(await Promise.all(names.map(read)));
    return workspaces.ok
      ? ok(workspaces.value.filter(workspace => workspace !== null))
      : workspaces;
  };

  return {
    list,
    read,
    write: workspace =>
      writeText(fileOf(workspace.name), encodeWorkspace(workspace)),
  };
};
