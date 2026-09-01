import { describe, expect, it } from "bun:test";
import { frontmatterBlock, frontmatterName, isSkillName } from "../src/domain/skill";

const nameOf = (text: string): string | null => {
  const block = frontmatterBlock(text);
  return block === null ? null : frontmatterName(block);
};

describe("frontmatterBlock", () => {
  it("returns the lines between the delimiters", () => {
    expect(frontmatterBlock("---\nname: a\ndescription: b\n---\n# Title\n")).toEqual([
      "name: a",
      "description: b",
    ]);
  });

  it("accepts carriage returns and a trailing space on a delimiter", () => {
    expect(frontmatterBlock("--- \r\nname: a\r\n---\r\nbody\r\n")).toEqual(["name: a"]);
  });

  it("returns null when the file does not open with a delimiter", () => {
    expect(frontmatterBlock("# Title\n\n---\nname: a\n---\n")).toBeNull();
  });

  it("returns null when the frontmatter never closes", () => {
    expect(frontmatterBlock("---\nname: a\n# Title\n")).toBeNull();
  });

  it("returns an empty block for frontmatter with no fields", () => {
    expect(frontmatterBlock("---\n\n---\n")).toEqual([""]);
  });
});

describe("frontmatterName", () => {
  it("reads a bare name", () => {
    expect(nameOf("---\nname: ast-grep\n---\n")).toBe("ast-grep");
  });

  it("trims the surrounding whitespace", () => {
    expect(nameOf("---\nname:   ast-grep   \n---\n")).toBe("ast-grep");
  });

  it("strips double quotes", () => {
    expect(nameOf('---\nname: "ast-grep"\n---\n')).toBe("ast-grep");
  });

  it("strips single quotes", () => {
    expect(nameOf("---\nname: 'ast-grep'\n---\n")).toBe("ast-grep");
  });

  it("reads the name from any line of the block", () => {
    expect(nameOf("---\ndescription: b\nname: ast-grep\n---\n")).toBe("ast-grep");
  });

  it("ignores a nested name field", () => {
    expect(nameOf("---\nmetadata:\n  name: nested\n---\n")).toBeNull();
  });

  it("returns null when the block declares no name", () => {
    expect(nameOf("---\ndescription: b\n---\n")).toBeNull();
  });

  it("returns an empty string for an empty name field", () => {
    expect(nameOf("---\nname:\n---\n")).toBe("");
  });
});

describe("isSkillName", () => {
  it("accepts lowercase letters, digits and single hyphens", () => {
    for (const name of ["a", "ast-grep", "skill2", "a-1-b", "x".repeat(64)]) {
      expect(isSkillName(name)).toBe(true);
    }
  });

  it("rejects an empty name", () => {
    expect(isSkillName("")).toBe(false);
  });

  it("rejects a name longer than 64 characters", () => {
    expect(isSkillName("x".repeat(65))).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(isSkillName("Ast-Grep")).toBe(false);
  });

  it("rejects characters outside a-z, 0-9 and hyphen", () => {
    for (const name of ["ast_grep", "ast grep", "ast.grep", "ast/grep", "café"]) {
      expect(isSkillName(name)).toBe(false);
    }
  });

  it("rejects a leading or a trailing hyphen", () => {
    expect(isSkillName("-ast-grep")).toBe(false);
    expect(isSkillName("ast-grep-")).toBe(false);
    expect(isSkillName("-")).toBe(false);
  });

  it("rejects consecutive hyphens", () => {
    expect(isSkillName("ast--grep")).toBe(false);
  });
});
