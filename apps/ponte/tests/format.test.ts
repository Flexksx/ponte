import { describe, expect, it } from "bun:test";
import { formatShortCommit } from "../src/cli/format";

describe("formatShortCommit", () => {
  it("keeps the first seven characters", () => {
    expect(formatShortCommit("a1b2c3d4e5f6")).toBe("a1b2c3d");
  });
});
