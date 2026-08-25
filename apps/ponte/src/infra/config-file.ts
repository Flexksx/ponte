import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { normalizeConfig, type Config } from "../domain/config";
import { decodeConfig, encodeConfig } from "./config-codec";
import { configDirectoryPath, configFilePath, promptFilePath } from "./paths";

export const readConfig = async (): Promise<Config | null> => {
  const file = Bun.file(configFilePath());
  if (!(await file.exists())) return null;
  const parsed = Bun.TOML.parse(await file.text());
  return normalizeConfig(decodeConfig(parsed), configDirectoryPath());
};

export const writeConfig = async (config: Config): Promise<void> => {
  const path = configFilePath();
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, encodeConfig(config));
};

export const readPrompt = async (filename: string): Promise<string | null> => {
  const file = Bun.file(promptFilePath(filename));
  if (!(await file.exists())) return null;
  return file.text();
};

export const writePrompt = async (filename: string, content: string): Promise<void> => {
  const path = promptFilePath(filename);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
};

export const resolveContent = async (fileOrLiteral: string): Promise<string> => {
  const file = Bun.file(fileOrLiteral);
  if (await file.exists()) return file.text();
  return fileOrLiteral;
};
