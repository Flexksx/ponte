import { describe, expect, it } from "bun:test";
import { mkdir, symlink } from "node:fs/promises";
import { join } from "node:path";
import { CLAUDE_CODE_SHARED_SKILLS_VERSION } from "@ponte/core";
import type { Home } from "./harness";
import { newHarness, sourceEntry } from "./harness";

const isWindows = () => process.platform === "win32";

const withSkill = async (h: Home): Promise<string> => {
  await h.bootstrap();
  const source = h.fixture("simple_skill");
  await h.appendConfig(sourceEntry("skills", source));
  return source;
};

describe("shared skills directory", () => {
  it("links Codex, Cursor, OpenCode and Pi through .agents/skills", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    const source = await withSkill(h);

    await h.mustRun("sync");

    const shared = join(h.home, ".agents", "skills", "simple-skill");
    await h.assertSymlinkTo(shared, source);
    for (const vendor of ["codex", "cursor-agent", "opencode", "pi-agent"]) {
      expect(h.vendorSkillPath(vendor as "codex", "simple-skill")).toBe(shared);
    }
    await h.assertMissing(join(h.home, ".codex", "skills", "simple-skill"));
    await h.assertSymlinkTo(
      join(h.home, ".claude", "skills", "simple-skill"),
      source,
    );
    await h.close();
  });

  it("keeps Claude Code on .claude/skills below the cutoff", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    await h.setClaudeVersion("2.1.279");
    const source = await withSkill(h);

    await h.mustRun("sync");

    await h.assertSymlinkTo(
      join(h.home, ".claude", "skills", "simple-skill"),
      source,
    );
    await h.close();
  });

  it("moves Claude Code to .agents/skills from the cutoff", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    const source = await withSkill(h);
    await h.mustRun("sync");

    await h.setClaudeVersion(CLAUDE_CODE_SHARED_SKILLS_VERSION);
    const { stdout } = await h.mustRun("sync");

    expect(stdout).toContain("stale link(s) removed");
    await h.assertMissing(join(h.home, ".claude", "skills", "simple-skill"));
    await h.assertSymlinkTo(
      join(h.home, ".agents", "skills", "simple-skill"),
      source,
    );
    await h.close();
  });

  it("removes old links but keeps real files in the old directories", async () => {
    if (isWindows()) {
      return;
    }
    const h = await newHarness();
    const source = await withSkill(h);
    const old = join(h.home, ".codex", "skills");
    await mkdir(old, { recursive: true });
    await symlink(source, join(old, "simple-skill"));
    await h.writeFile(join(old, "mine", "SKILL.md"), "hand written");

    await h.mustRun("sync");

    await h.assertMissing(join(old, "simple-skill"));
    expect(await h.readFileText(join(old, "mine", "SKILL.md"))).toBe(
      "hand written",
    );
    await h.close();
  });
});
