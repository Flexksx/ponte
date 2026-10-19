<script lang="ts">
  import { api } from "../lib/api";
  import { workspaceHref } from "../lib/route";

  const workspaces = api.workspaces();
</script>

<h1>Workspaces</h1>
<p class="muted">One per effort. Agents keep them up to date.</p>

{#await workspaces}
  <p class="muted">Loading…</p>
{:then list}
  {#if list.length === 0}
    <p class="muted">
      No workspaces yet. An agent creates one with the
      <code>workspace_create</code> tool or <code>ponte ws new</code>.
    </p>
  {:else}
    <ul>
      {#each list as workspace (workspace.name)}
        <li>
          <a class="card" href={workspaceHref(workspace.name)}>
            <strong>{workspace.name}</strong>
            <span>{workspace.goal}</span>
            {#if workspace.next !== ""}
              <span class="next">Next: {workspace.next}</span>
            {/if}
            <span class="muted meta">
              {workspace.links.length} links · {workspace.decisions.length} decisions
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
{:catch error}
  <p class="error">{error.message}</p>
{/await}

<style>
  ul {
    list-style: none;
    padding: 0;
    margin: 20px 0 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    padding: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    text-decoration: none;
  }

  .card:hover {
    border-color: var(--accent);
  }

  .next {
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--accent-soft);
    font-size: 14px;
  }

  .meta {
    margin-top: auto;
    font-size: 13px;
  }
</style>
