import { readPrompt, resolveContent, writePrompt } from "../infra/config-file";
import { requireConfig } from "./configuration";

export const readSystemPrompt = async (): Promise<string | null> => {
  const config = await requireConfig();
  return readPrompt(config.systemPromptFile);
};

export const setSystemPrompt = async (fileOrLiteral: string): Promise<void> => {
  const config = await requireConfig();
  await writePrompt(config.systemPromptFile, await resolveContent(fileOrLiteral));
};
