import { describe, expect, it } from "bun:test";
import {
  parseSkillName,
  requireUniqueSkillNames,
  SkillNameError,
} from "@ponte/core";

const nameIn = (text: string | null): string =>
  parseSkillName("src", "/dir", text);

const rejectionOf = (text: string | null): string => {
  try {
    nameIn(text);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("parseSkillName accepted the text");
};

const skillDoc = (name: string): string => `---\nname: ${name}\n---\n`;

describe("parseSkillName", () => {
  it("accepts lowercase letters, digits and single hyphens", () => {
    for (const name of ["a", "ast-grep", "skill2", "a-1-b", "x".repeat(64)]) {
      expect(nameIn(skillDoc(name))).toBe(name);
    }
  });

  it("trims the surrounding whitespace", () => {
    expect(nameIn("---\nname:   ast-grep   \n---\n")).toBe("ast-grep");
  });

  it("strips quotes", () => {
    expect(nameIn('---\nname: "ast-grep"\n---\n')).toBe("ast-grep");
    expect(nameIn("---\nname: 'ast-grep'\n---\n")).toBe("ast-grep");
  });

  it("reads the name from any line of the block", () => {
    expect(nameIn("---\ndescription: b\nname: ast-grep\n---\n")).toBe(
      "ast-grep",
    );
  });

  it("accepts carriage returns and a trailing space on a delimiter", () => {
    expect(nameIn("--- \r\nname: ast-grep\r\n---\r\nbody\r\n")).toBe(
      "ast-grep",
    );
  });

  it("rejects a directory with no SKILL.md", () => {
    expect(() => nameIn(null)).toThrow(SkillNameError);
    expect(rejectionOf(null)).toContain("no SKILL.md in /dir");
  });

  it("rejects a file that does not open with a delimiter", () => {
    expect(rejectionOf("# Title\n\n---\nname: a\n---\n")).toContain(
      "no frontmatter",
    );
  });

  it("rejects frontmatter that never closes", () => {
    expect(rejectionOf("---\nname: a\n# Title\n")).toContain("no frontmatter");
  });

  it("rejects frontmatter with no name of its own", () => {
    expect(rejectionOf("---\ndescription: b\n---\n")).toContain(
      "declares no name",
    );
    expect(rejectionOf("---\n\n---\n")).toContain("declares no name");
    expect(rejectionOf("---\nmetadata:\n  name: nested\n---\n")).toContain(
      "declares no name",
    );
  });

  it("rejects a name outside a-z, 0-9 and single hyphens", () => {
    for (const name of [
      "",
      "x".repeat(65),
      "Ast-Grep",
      "ast_grep",
      "ast grep",
      "ast.grep",
      "ast/grep",
      "café",
      "-ast-grep",
      "ast-grep-",
      "-",
      "ast--grep",
    ]) {
      expect(rejectionOf(skillDoc(name))).toContain("invalid name");
    }
  });
});

describe("requireUniqueSkillNames", () => {
  it("accepts distinct names", () => {
    expect(() =>
      requireUniqueSkillNames([
        { name: "a", source: "s1" },
        { name: "b", source: "s2" },
      ]),
    ).not.toThrow();
  });

  it("rejects two entries with the same name and names both sources", () => {
    try {
      requireUniqueSkillNames([
        { name: "a", source: "s1" },
        { name: "a", source: "s2" },
      ]);
      expect(true).toBe(false);
    } catch (error) {
      expect(error instanceof SkillNameError).toBe(true);
      expect((error as Error).message).toContain("s1");
      expect((error as Error).message).toContain("s2");
    }
  });
});
