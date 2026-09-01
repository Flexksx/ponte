import { basename } from "node:path";
import type { SourceEntry } from "../domain/config";
import {
  frontmatterBlock,
  frontmatterName,
  InvalidSkillNameError,
  isSkillName,
  MissingFrontmatterError,
  MissingSkillFileError,
  MissingSkillNameError,
  VendoredSkillRenamedError,
} from "../domain/skill";
import { describeSource, parseSource } from "../domain/source";
import { cachedSourceDirectory } from "../infra/git";
import { gitCacheDirectoryPath } from "../infra/paths";
import { readSkillFile, skillFilePath } from "../infra/skill-file";

export type SkillRow = { readonly name: string | null; readonly entry: SourceEntry };

export const sourceOf = (entry: SourceEntry): string =>
  describeSource(parseSource(entry.source, entry.ref, entry.subdir));

export const readSkillName = async (source: string, directory: string): Promise<string> => {
  const text = await readSkillFile(directory);
  if (text === null) throw new MissingSkillFileError(source, directory);
  const file = skillFilePath(directory);
  const block = frontmatterBlock(text);
  if (block === null) throw new MissingFrontmatterError(source, file);
  const name = frontmatterName(block);
  if (name === null) throw new MissingSkillNameError(source, file);
  if (!isSkillName(name)) throw new InvalidSkillNameError(source, name);
  return name;
};

export const readSkillNameOrNull = async (directory: string): Promise<string | null> => {
  const text = await readSkillFile(directory);
  if (text === null) return null;
  const block = frontmatterBlock(text);
  if (block === null) return null;
  const name = frontmatterName(block);
  return name !== null && isSkillName(name) ? name : null;
};

export const checkVendoredSkillName = async (source: string, directory: string): Promise<void> => {
  const name = basename(directory);
  const declared = await readSkillName(source, directory);
  if (declared !== name) throw new VendoredSkillRenamedError(directory, name, declared);
};

export const listSkills = async (entries: readonly SourceEntry[]): Promise<SkillRow[]> => {
  const rows: SkillRow[] = [];
  for (const entry of entries) {
    const directory = await cachedSourceDirectory(
      parseSource(entry.source, entry.ref, entry.subdir),
      gitCacheDirectoryPath(),
    );
    rows.push({
      name: directory === null ? null : await readSkillNameOrNull(directory),
      entry,
    });
  }
  return rows;
};
