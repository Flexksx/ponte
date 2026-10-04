import { join } from "node:path";
import { err, ok, type Result } from "../shared";
import type { NamedSkill, SkillProblem } from "./types";

export const SKILL_FILE = "SKILL.md";

export const MAX_SKILL_NAME_LENGTH = 64;

const FRONTMATTER_DELIMITER = "---";

const NAME_FIELD = /^name:[ \t]*(.*)$/;

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const QUOTES = ['"', "'"];

const withoutCarriageReturn = (line: string): string =>
  line.endsWith("\r") ? line.slice(0, -1) : line;

const isDelimiter = (line: string): boolean =>
  line.trim() === FRONTMATTER_DELIMITER;

const withoutQuotes = (value: string): string => {
  const quote = value.slice(0, 1);
  return QUOTES.includes(quote) && value.length > 1 && value.endsWith(quote)
    ? value.slice(1, -1)
    : value;
};

const frontmatterBlock = (text: string): readonly string[] | null => {
  const lines = text.split("\n").map(withoutCarriageReturn);
  if (lines[0] === undefined || !isDelimiter(lines[0])) {
    return null;
  }
  const end = lines.findIndex((line, index) => index > 0 && isDelimiter(line));
  return end === -1 ? null : lines.slice(1, end);
};

const frontmatterName = (block: readonly string[]): string | null => {
  for (const line of block) {
    const match = NAME_FIELD.exec(line);
    if (match !== null) {
      return withoutQuotes((match[1] ?? "").trim());
    }
  }
  return null;
};

const isSkillName = (name: string): boolean =>
  name.length <= MAX_SKILL_NAME_LENGTH && SKILL_NAME.test(name);

export const skillFilePath = (directory: string): string =>
  join(directory, SKILL_FILE);

export const parseSkillName = (
  source: string,
  directory: string,
  text: string | null,
): Result<string, SkillProblem> => {
  if (text === null) {
    return err({ kind: "missing-skill-file", source, directory });
  }
  const file = skillFilePath(directory);
  const block = frontmatterBlock(text);
  if (block === null) {
    return err({ kind: "missing-frontmatter", source, file });
  }
  const name = frontmatterName(block);
  if (name === null) {
    return err({ kind: "missing-skill-name", source, file });
  }
  if (!isSkillName(name)) {
    return err({ kind: "invalid-skill-name", source, name });
  }
  return ok(name);
};

export const requireUniqueSkillNames = (
  skills: readonly NamedSkill[],
): Result<null, SkillProblem> => {
  const seen = new Map<string, string>();
  for (const skill of skills) {
    const first = seen.get(skill.name);
    if (first !== undefined) {
      return err({
        kind: "duplicate-skill-name",
        name: skill.name,
        first,
        second: skill.source,
      });
    }
    seen.set(skill.name, skill.source);
  }
  return ok(null);
};

export const checkVendoredSkillName = (
  directory: string,
  name: string,
  declared: string,
): Result<null, SkillProblem> =>
  declared === name
    ? ok(null)
    : err({ kind: "vendored-skill-renamed", directory, name, declared });
