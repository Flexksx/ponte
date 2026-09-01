export const SKILL_FILE = "SKILL.md";

const FRONTMATTER_DELIMITER = "---";

const NAME_FIELD = /^name:[ \t]*(.*)$/;

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_SKILL_NAME_LENGTH = 64;

const QUOTES = ['"', "'"];

export type NamedSkill = { readonly name: string; readonly source: string };

export class MissingSkillFileError extends Error {
  constructor(source: string, directory: string) {
    super(`skill ${source}: no ${SKILL_FILE} in ${directory} - every skill directory needs one`);
  }
}

export class MissingFrontmatterError extends Error {
  constructor(source: string, file: string) {
    super(`skill ${source}: ${file} has no frontmatter - add a --- block that declares name`);
  }
}

export class MissingSkillNameError extends Error {
  constructor(source: string, file: string) {
    super(`skill ${source}: the frontmatter in ${file} declares no name`);
  }
}

export class InvalidSkillNameError extends Error {
  constructor(source: string, name: string) {
    super(
      `skill ${source}: ${SKILL_FILE} declares the invalid name "${name}" - a name holds 1 to ${MAX_SKILL_NAME_LENGTH} characters from a-z, 0-9 and single hyphens, and it starts and ends with a letter or a digit`,
    );
  }
}

export class DuplicateSkillNameError extends Error {
  constructor(name: string, first: string, second: string) {
    super(
      `two skills declare the name "${name}": ${first} and ${second} - remove one of the entries`,
    );
  }
}

export class VendoredSkillRenamedError extends Error {
  constructor(directory: string, name: string, declared: string) {
    super(
      `vendored skill ${directory}: its ${SKILL_FILE} declares name "${declared}" but the directory is named "${name}" - restore the name, or delete the directory and run ponte sync`,
    );
  }
}

const withoutCarriageReturn = (line: string): string =>
  line.endsWith("\r") ? line.slice(0, -1) : line;

const isDelimiter = (line: string): boolean => line.trim() === FRONTMATTER_DELIMITER;

const withoutQuotes = (value: string): string => {
  const quote = value.slice(0, 1);
  return QUOTES.includes(quote) && value.length > 1 && value.endsWith(quote)
    ? value.slice(1, -1)
    : value;
};

export const frontmatterBlock = (text: string): readonly string[] | null => {
  const lines = text.split("\n").map(withoutCarriageReturn);
  if (lines[0] === undefined || !isDelimiter(lines[0])) return null;
  const end = lines.findIndex((line, index) => index > 0 && isDelimiter(line));
  return end === -1 ? null : lines.slice(1, end);
};

export const frontmatterName = (block: readonly string[]): string | null => {
  for (const line of block) {
    const match = NAME_FIELD.exec(line);
    if (match !== null) return withoutQuotes((match[1] ?? "").trim());
  }
  return null;
};

export const isSkillName = (name: string): boolean =>
  name.length <= MAX_SKILL_NAME_LENGTH && SKILL_NAME.test(name);

export const requireUniqueSkillNames = (skills: readonly NamedSkill[]): void => {
  const seen = new Map<string, string>();
  for (const skill of skills) {
    const first = seen.get(skill.name);
    if (first !== undefined) throw new DuplicateSkillNameError(skill.name, first, skill.source);
    seen.set(skill.name, skill.source);
  }
};
