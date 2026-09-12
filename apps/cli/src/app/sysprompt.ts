import type {
  Config,
  ReadPrompt,
  ResolveContent,
  WritePrompt,
} from "@ponte/core";

type ReadSystemPromptDeps = {
  readPrompt: ReadPrompt;
};

export const createReadSystemPrompt =
  (deps: ReadSystemPromptDeps) =>
  (config: Config): Promise<string | null> =>
    deps.readPrompt(config.systemPromptFile);

type SetSystemPromptDeps = {
  writePrompt: WritePrompt;
  resolveContent: ResolveContent;
};

export const createSetSystemPrompt =
  (deps: SetSystemPromptDeps) =>
  async (config: Config, fileOrLiteral: string): Promise<void> => {
    await deps.writePrompt(
      config.systemPromptFile,
      await deps.resolveContent(fileOrLiteral),
    );
  };
