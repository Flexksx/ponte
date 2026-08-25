import { describe, it, expect } from "bun:test";
import { createHash } from "node:crypto";
import { computeHash, hashEntries } from "../src/domain/hashing";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("hashEntries", () => {
  it("hashes one entry with a trailing newline and full hex", () => {
    const file: readonly [string, string] = ["b.txt", "hello"];
    const want = sha256(`b.txt:${sha256("hello")}\n`);
    expect(hashEntries([file])).toBe(want);
  });

  it("keeps the given order byte-for-byte", () => {
    const files: ReadonlyArray<readonly [string, string]> = [
      ["aa", "x"],
      ["b", "y"],
    ];
    const want = sha256(`aa:${sha256("x")}\nb:${sha256("y")}\n`);
    expect(hashEntries(files)).toBe(want);
  });
});

describe("computeHash", () => {
  it("matches the Go line format and truncates to 32", () => {
    const body = `systemprompt:${sha256("hi")}\nskill:a:DIRA\nsubagent:b:DIRB\n`;
    const want = sha256(body).slice(0, 32);
    expect(computeHash("hi", [["a", "DIRA"]], [["b", "DIRB"]])).toBe(want);
  });

  it("sorts skills and subagents by name before hashing", () => {
    const body = `systemprompt:${sha256("p")}\nskill:a:H1\nskill:z:H2\nsubagent:m:H3\n`;
    const want = sha256(body).slice(0, 32);
    const got = computeHash(
      "p",
      [
        ["z", "H2"],
        ["a", "H1"],
      ],
      [["m", "H3"]],
    );
    expect(got).toBe(want);
  });
});
