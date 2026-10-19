import { describe, expect, it } from "bun:test";
import {
  type AgentSession,
  applyWorkspaceEdit,
  checkWorkspaceName,
  findSessionsForWorkspace,
  findWorkspacesForDirectory,
  newWorkspace,
  parseGitHubRepository,
  type Workspace,
} from "@ponte/core";

const HOME = "/home/u";

const withLinks = (name: string, ...targets: string[]): Workspace => ({
  ...newWorkspace(name, "goal"),
  links: targets.map(target => ({ target, note: "" })),
});

describe("applyWorkspaceEdit", () => {
  it("replaces the note of a link that is already there", () => {
    const linked = applyWorkspaceEdit(withLinks("w", "https://x/1"), {
      kind: "link",
      target: "https://x/1",
      note: "new note",
    });
    expect(linked.ok && linked.value.links).toEqual([
      { target: "https://x/1", note: "new note" },
    ]);
  });

  it("refuses to unlink a target the workspace does not have", () => {
    const unlinked = applyWorkspaceEdit(withLinks("w"), {
      kind: "unlink",
      target: "https://x/1",
    });
    expect(unlinked).toEqual({
      ok: false,
      error: { kind: "link-not-found", target: "https://x/1" },
    });
  });
});

describe("tags", () => {
  it("adds a tag once and keeps the tags sorted", () => {
    const tagged = ["work", "extole", "work"].reduce<Workspace>(
      (workspace, tag) => {
        const edited = applyWorkspaceEdit(workspace, { kind: "tag", tag });
        return edited.ok ? edited.value : workspace;
      },
      withLinks("w"),
    );
    expect(tagged.tags).toEqual(["extole", "work"]);
  });

  it("rejects a tag that is not a lowercase slug, and removing a missing tag", () => {
    expect(
      applyWorkspaceEdit(withLinks("w"), { kind: "tag", tag: "Work Stuff" }).ok,
    ).toBe(false);
    expect(
      applyWorkspaceEdit(withLinks("w"), { kind: "untag", tag: "work" }),
    ).toEqual({
      ok: false,
      error: { kind: "tag-not-found", tag: "work" },
    });
  });
});

describe("parseGitHubRepository", () => {
  it("reads the owner and name from GitHub URLs and remotes", () => {
    for (const url of [
      "https://github.com/extole/tech/pull/2204",
      "git@github.com:extole/tech.git",
      "https://github.com/extole/tech.git\n",
      "https://github.com/extole/tech",
    ]) {
      expect(parseGitHubRepository(url)).toEqual({
        owner: "extole",
        name: "tech",
      });
    }
  });

  it("ignores a URL that is not on GitHub", () => {
    expect(
      parseGitHubRepository("https://extole.atlassian.net/browse/ENG-1"),
    ).toBeNull();
  });
});

describe("findWorkspacesForDirectory", () => {
  const workspaces = [
    withLinks("builds", "~/workspaces/ENG-1", "https://github.com/o/r/pull/1"),
    withLinks("databases", "/home/u/workspaces/ENG-10"),
  ];

  const namesFor = (directory: string): string[] =>
    findWorkspacesForDirectory(workspaces, directory, HOME).map(w => w.name);

  it("matches a linked folder and the folders inside it", () => {
    expect(namesFor("/home/u/workspaces/ENG-1")).toEqual(["builds"]);
    expect(namesFor("/home/u/workspaces/ENG-1/code/tech")).toEqual(["builds"]);
  });

  it("does not match a sibling folder that shares a name prefix", () => {
    expect(namesFor("/home/u/workspaces/ENG-10")).toEqual(["databases"]);
  });

  it("does not match a parent of a linked folder", () => {
    expect(namesFor("/home/u/workspaces")).toEqual([]);
  });
});

describe("findSessionsForWorkspace", () => {
  const session = (id: string, directory: string, startedAt: string) =>
    ({
      agent: "claude-code",
      id,
      directory,
      startedAt,
      title: "t",
      resume: "r",
    }) satisfies AgentSession;

  it("keeps the sessions inside linked folders, newest first", () => {
    const sessions = [
      session("old", "/home/u/workspaces/ENG-1", "2026-10-01T10:00:00Z"),
      session("other", "/home/u/tech", "2026-10-05T10:00:00Z"),
      session("new", "/home/u/workspaces/ENG-1/code", "2026-10-09T10:00:00Z"),
    ];
    const found = findSessionsForWorkspace(
      withLinks("builds", "~/workspaces/ENG-1"),
      sessions,
      HOME,
    );
    expect(found.map(s => s.id)).toEqual(["new", "old"]);
  });
});

describe("checkWorkspaceName", () => {
  it("accepts lowercase words joined by hyphens", () => {
    expect(checkWorkspaceName("faster-image-builds").ok).toBe(true);
  });

  it("rejects a name that could leave the workspaces folder", () => {
    expect(checkWorkspaceName("../config").ok).toBe(false);
  });
});
