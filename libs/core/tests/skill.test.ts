import { describe, expect, it } from "bun:test";
import {
  parseSkillName,
  requireUniqueSkillNames,
  type SkillProblem,
} from "@ponte/core";

const nameIn = (text: string | null): string | null => {
  const name = parseSkillName("src", "/dir", text);
  return name.ok ? name.value : null;
};

const rejectionOf = (text: string | null): SkillProblem => {
  const name = parseSkillName("src", "/dir", text);
  if (name.ok) {
    throw new Error("parseSkillName accepted the text");
  }
  return name.error;
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
    expect(rejectionOf(null)).toEqual({
      kind: "missing-skill-file",
      source: "src",
      directory: "/dir",
    });
  });

  it("rejects a file that does not open with a delimiter", () => {
    expect(rejectionOf("# Title\n\n---\nname: a\n---\n").kind).toBe(
      "missing-frontmatter",
    );
  });

  it("rejects frontmatter that never closes", () => {
    expect(rejectionOf("---\nname: a\n# Title\n").kind).toBe(
      "missing-frontmatter",
    );
  });

  it("rejects frontmatter with no name of its own", () => {
    for (const text of [
      "---\ndescription: b\n---\n",
      "---\n\n---\n",
      "---\nmetadata:\n  name: nested\n---\n",
    ]) {
      expect(rejectionOf(text).kind).toBe("missing-skill-name");
    }
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
      expect(rejectionOf(skillDoc(name))).toEqual({
        kind: "invalid-skill-name",
        source: "src",
        name,
      });
    }
  });
});

describe("requireUniqueSkillNames", () => {
  it("accepts distinct names", () => {
    expect(
      requireUniqueSkillNames([
        { name: "a", source: "s1" },
        { name: "b", source: "s2" },
      ]).ok,
    ).toBe(true);
  });

  it("rejects two entries with the same name and names both sources", () => {
    expect(
      requireUniqueSkillNames([
        { name: "a", source: "s1" },
        { name: "a", source: "s2" },
      ]),
    ).toEqual({
      ok: false,
      error: {
        kind: "duplicate-skill-name",
        name: "a",
        first: "s1",
        second: "s2",
      },
    });
  });
});
