import { describe, expect, it } from "bun:test";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import type { Home } from "./harness";
import { newHarness } from "./harness";

const isWindows = () => process.platform === "win32";

type SkillRepo = {
  readonly url: string;
  readonly sha: string;
  readonly commit: (content: string) => Promise<string>;
};

const randomName = () => Math.random().toString(36).slice(2, 8);

const newSkillRepo = async (h: Home, content: string): Promise<SkillRepo> => {
  const repoPath = join(h.home, "repos", `skill-${randomName()}`);
  await mkdir(repoPath, { recursive: true });

  const git = async (...args: string[]): Promise<string> => {
    const res = await $`git ${args}`.cwd(repoPath).quiet();
    if (res.exitCode !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${res.stdout}${res.stderr}`);
    }
    return res.stdout.toString().trim();
  };

  await git("init");
  await git("config", "user.email", "test@example.com");
  await git("config", "user.name", "Test");

  const commit = async (text: string): Promise<string> => {
    await writeFile(join(repoPath, "SKILL.md"), text);
    await git("add", ".");
    await git("commit", "-m", "update skill");
    return git("rev-parse", "HEAD");
  };

  return { url: `file://${repoPath}`, sha: await commit(content), commit };
};

const newProject = async (h: Home, config: string): Promise<string> => {
  const root = join(h.home, `project-${randomName()}`);
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "ponte.toml"), config);
  return root;
};

const gitSkillConfig = (name: string, repo: SkillRepo, ref: string): string =>
  `[skills.${name}]\nsource = ${JSON.stringify(repo.url)}\nref = ${JSON.stringify(ref)}\n`;

describe("project sync", () => {
  it("finds the project from a subdirectory", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, '[skills.mine]\nsource = "skills/mine"\n');
    await h.writeFile(join(root, "skills", "mine", "SKILL.md"), "# mine\n");
    const deep = join(root, "src", "nested");
    await mkdir(deep, { recursive: true });

    const { stdout } = await h.mustRunIn(deep, "sync");

    expect(stdout).toContain(root);
    await h.assertSymlinkTo(h.projectSkillLink(root, "mine"), "../../skills/mine");
    await h.close();
  });

  it("vendors a git skill, strips .git, writes the lock and links relatively", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, "# version one\n");
    const root = await newProject(h, gitSkillConfig("git-skill", repo, repo.sha));

    await h.mustRunIn(root, "sync");

    const vendored = h.vendoredSkillPath(root, "git-skill");
    await h.assertFileEquals(join(vendored, "SKILL.md"), "# version one\n");
    expect(await h.exists(join(vendored, ".git"))).toBe(false);
    expect(await h.readFileText(h.lockPath(root))).toContain(repo.sha);
    await h.assertSymlinkTo(
      h.projectSkillLink(root, "git-skill"),
      "../../.ponte/sources/git-skill",
    );
    await h.assertFileEquals(
      join(h.projectSkillLink(root, "git-skill"), "SKILL.md"),
      "# version one\n",
    );
    await h.close();
  });

  it("never overwrites an edited vendored skill", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, "# version one\n");
    const root = await newProject(h, gitSkillConfig("git-skill", repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const skillFile = join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md");
    await h.writeFile(skillFile, "# edited by hand\n");
    const { stdout } = await h.mustRunIn(root, "sync");

    expect(stdout).not.toContain("vendored into");
    await h.assertFileEquals(skillFile, "# edited by hand\n");
    await h.close();
  });

  it("links a local source outside the project by absolute path", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const outside = h.fixtureDir("simple_skill");
    const root = await newProject(h, `[skills.simple]\nsource = ${JSON.stringify(outside)}\n`);

    await h.mustRunIn(root, "sync");

    await h.assertSymlinkTo(h.projectSkillLink(root, "simple"), outside);
    await h.close();
  });

  it("removes a stale link and leaves a real directory alone", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, '[skills.mine]\nsource = "skills/mine"\n');
    await h.writeFile(join(root, "skills", "mine", "SKILL.md"), "# mine\n");
    await h.mustRunIn(root, "sync");

    const handmade = h.projectSkillLink(root, "handmade");
    await h.writeFile(join(handmade, "SKILL.md"), "hand written");
    await symlink("/nowhere", h.projectSkillLink(root, "dropped"));
    await h.writeFile(join(root, "ponte.toml"), "");

    const { stdout } = await h.mustRunIn(root, "sync");

    expect(stdout).toContain("stale link(s) removed");
    await h.assertMissing(h.projectSkillLink(root, "mine"));
    await h.assertMissing(h.projectSkillLink(root, "dropped"));
    await h.assertFileEquals(join(handmade, "SKILL.md"), "hand written");
    await h.close();
  });

  it("does not bootstrap the global config", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, '[skills.mine]\nsource = "skills/mine"\n');
    await h.writeFile(join(root, "skills", "mine", "SKILL.md"), "# mine\n");

    await h.mustRunIn(root, "sync");

    expect(await h.exists(h.configPath("config.toml"))).toBe(false);
    expect(await h.exists(join(h.home, ".config", "ponte"))).toBe(false);
    expect(await h.exists(join(h.home, ".claude"))).toBe(false);
    await h.close();
  });

  it("rejects an unknown top-level key", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, "[vendors.claude-code]\nenabled = true\n");

    const { stderr, exitCode } = await h.runIn(root, "sync");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("vendors");
    expect(stderr).toContain("unknown key");
    await h.close();
  });
});

describe("project skills and status", () => {
  it("lists the project skills with their kind and locked commit", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, "# version one\n");
    const root = await newProject(
      h,
      `${gitSkillConfig("git-skill", repo, repo.sha)}\n[skills.mine]\nsource = "skills/mine"\n`,
    );
    await h.writeFile(join(root, "skills", "mine", "SKILL.md"), "# mine\n");
    await h.mustRunIn(root, "sync");

    const { stdout } = await h.mustRunIn(root, "skills");

    expect(stdout).toContain("vendored");
    expect(stdout).toContain("local");
    expect(stdout).toContain(repo.sha.slice(0, 7));
    await h.close();
  });

  it("reports the link state of the project skills directory", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, '[skills.mine]\nsource = "skills/mine"\n');
    await h.writeFile(join(root, "skills", "mine", "SKILL.md"), "# mine\n");

    const before = await h.mustRunIn(root, "status");
    expect(before.stdout).toContain("not synced");

    await h.mustRunIn(root, "sync");

    const after = await h.mustRunIn(root, "status");
    expect(after.stdout).toContain(join(root, ".agents", "skills"));
    expect(after.stdout).toContain("in sync");
    await h.close();
  });
});

describe("project update", () => {
  it("overwrites a clean copy with the configured ref", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, "# version one\n");
    const root = await newProject(h, gitSkillConfig("git-skill", repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const next = await repo.commit("# version two\n");
    await h.writeFile(join(root, "ponte.toml"), gitSkillConfig("git-skill", repo, next));

    const { stdout } = await h.mustRunIn(root, "update", "git-skill");

    expect(stdout).toContain(next.slice(0, 7));
    await h.assertFileEquals(
      join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md"),
      "# version two\n",
    );
    expect(await h.readFileText(h.lockPath(root))).toContain(next);
    await h.assertFileEquals(
      join(h.projectSkillLink(root, "git-skill"), "SKILL.md"),
      "# version two\n",
    );
    await h.close();
  });

  it("refuses an edited copy without --force and obeys --force", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const repo = await newSkillRepo(h, "# version one\n");
    const root = await newProject(h, gitSkillConfig("git-skill", repo, repo.sha));
    await h.mustRunIn(root, "sync");

    const skillFile = join(h.vendoredSkillPath(root, "git-skill"), "SKILL.md");
    await h.writeFile(skillFile, "# edited by hand\n");

    const refused = await h.runIn(root, "update");
    expect(refused.exitCode).not.toBe(0);
    expect(refused.stderr).toContain("git-skill");
    expect(refused.stderr).toContain("--force");
    await h.assertFileEquals(skillFile, "# edited by hand\n");

    await h.mustRunIn(root, "update", "--force");
    await h.assertFileEquals(skillFile, "# version one\n");
    await h.close();
  });

  it("errors outside a project", async () => {
    if (isWindows()) return;
    const h = await newHarness();

    const { stderr, exitCode } = await h.run("update");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("ponte.toml");
    await h.close();
  });

  it("errors on a skill the project does not declare", async () => {
    if (isWindows()) return;
    const h = await newHarness();
    const root = await newProject(h, '[skills.mine]\nsource = "skills/mine"\n');

    const { stderr, exitCode } = await h.runIn(root, "update", "absent");

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("absent");
    await h.close();
  });
});
