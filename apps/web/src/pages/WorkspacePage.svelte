<script lang="ts">
  import CopyCommand from "../components/CopyCommand.svelte";
  import { api } from "../lib/api";
  import { AGENT_LABELS, formatDateTime } from "../lib/format";
  import { groupLinks } from "../lib/links";
  import { HOME_HREF } from "../lib/route";

  const COLLAPSED_SESSION_COUNT = 10;

  let { name }: { name: string } = $props();
  let showAllSessions = $state(false);

  const workspace = $derived(api.workspace(name));
  const sessions = $derived(api.workspaceSessions(name));
</script>

<a class="back" href={HOME_HREF}>← Workspaces</a>

{#await workspace}
  <p class="muted">Loading…</p>
{:then current}
  <h1>{current.name}</h1>
  <p class="goal">{current.goal}</p>
  {#if current.next !== ""}
    <p class="next"><span class="muted">Next</span> {current.next}</p>
  {/if}

  <div class="columns">
    <div>
      {#each groupLinks(current.links) as group (group.heading)}
        <h2>{group.heading}</h2>
        <ul class="links">
          {#each group.links as link (link.label)}
            <li>
              {#if link.href === null}
                <code>{link.label}</code>
              {:else}
                <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
              {/if}
              {#if link.note !== ""}
                <span class="muted">{link.note}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <h2>Links</h2>
        <p class="muted">No links yet.</p>
      {/each}

      <h2>Decisions</h2>
      {#if current.decisions.length === 0}
        <p class="muted">No decisions recorded.</p>
      {:else}
        <ol class="decisions">
          {#each current.decisions.toReversed() as decision, index (index)}
            <li><span class="muted date">{decision.date}</span> {decision.text}</li>
          {/each}
        </ol>
      {/if}
    </div>

    <section>
      <h2>Sessions</h2>
      {#await sessions}
        <p class="muted">Reading agent sessions…</p>
      {:then list}
        {#if list.length === 0}
          <p class="muted">No Claude Code or pi session ran in this workspace's folders.</p>
        {:else}
          <ul class="sessions">
            {#each showAllSessions ? list : list.slice(0, COLLAPSED_SESSION_COUNT) as session (session.id)}
              <li>
                <div class="session-head">
                  <span class="agent">{AGENT_LABELS[session.agent]}</span>
                  <span class="muted">{formatDateTime(session.startedAt)}</span>
                </div>
                <p class="title">{session.title}</p>
                <CopyCommand command={session.resume} />
              </li>
            {/each}
          </ul>
          {#if list.length > COLLAPSED_SESSION_COUNT}
            <button type="button" class="more" onclick={() => (showAllSessions = !showAllSessions)}>
              {showAllSessions ? "Show fewer" : `Show all ${list.length}`}
            </button>
          {/if}
        {/if}
      {:catch error}
        <p class="error">{error.message}</p>
      {/await}
    </section>
  </div>
{:catch error}
  <p class="error">{error.message}</p>
{/await}

<style>
  .back {
    display: inline-block;
    margin-bottom: 12px;
    color: var(--muted);
    text-decoration: none;
  }

  .goal {
    margin: 0;
    font-size: 17px;
  }

  .next {
    margin: 14px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--accent-soft);
  }

  .columns {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 32px;
  }

  @media (max-width: 760px) {
    .columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  ul,
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .links li,
  .decisions li {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }

  .date {
    font-variant-numeric: tabular-nums;
  }

  .sessions li {
    padding: 12px;
    margin-bottom: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .session-head {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }

  .agent {
    font-weight: 600;
  }

  .title {
    margin: 4px 0 0;
    font-size: 14px;
  }

  .more {
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
</style>
