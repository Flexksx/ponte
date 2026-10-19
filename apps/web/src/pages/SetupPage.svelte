<script lang="ts">
  import { api, load } from "../lib/api";
  import { sourceText } from "../lib/format";

  const status = load(api.status());
  const systemPrompt = load(api.readSystemPrompt());
  const skills = load(api.listSkills());
  const subagents = load(api.listSubagents());
</script>

<h1>Setup</h1>
<p class="muted">What ponte links into each agent.</p>

<h2>Agents</h2>
{#await status}
  <p class="muted">Loading…</p>
{:then current}
  {#if current.mode === "global"}
    <p class="muted">System prompt file: <code>{current.report.promptFile}</code></p>
    <table>
      <thead>
        <tr><th>Agent</th><th>Enabled</th><th>Links</th><th>State</th></tr>
      </thead>
      <tbody>
        {#each current.report.vendors as agent (agent.name)}
          <tr>
            <td>{agent.name}</td>
            <td>{agent.enabled ? "yes" : "no"}</td>
            <td>{agent.linkCount}</td>
            <td class="state" data-state={agent.state}>{agent.state}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>
      Repo mode: <code>{current.report.root}</code>, {current.report.linkCount} links,
      <span class="state" data-state={current.report.state}>{current.report.state}</span>
    </p>
  {/if}
{:catch error}
  <p class="error">{error.message}</p>
{/await}

<h2>System prompt</h2>
{#await systemPrompt}
  <p class="muted">Loading…</p>
{:then prompt}
  <details>
    <summary>Show the prompt every agent gets ({prompt.split("\n").length} lines)</summary>
    <pre>{prompt}</pre>
  </details>
{:catch error}
  <p class="error">{error.message}</p>
{/await}

<h2>Skills</h2>
{#await skills}
  <p class="muted">Loading…</p>
{:then listing}
  {#if listing.rows.length === 0}
    <p class="muted">No skills configured.</p>
  {:else}
    <table>
      <thead>
        <tr><th>Name</th><th>Type</th><th>Source</th></tr>
      </thead>
      <tbody>
        {#each listing.rows as row (sourceText(row.entry))}
          <tr>
            <td>{row.name ?? "—"}</td>
            <td class="muted">{row.vendored ? "git" : "local"}</td>
            <td>{sourceText(row.entry)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:catch error}
  <p class="error">{error.message}</p>
{/await}

<h2>Subagents</h2>
{#await subagents}
  <p class="muted">Loading…</p>
{:then list}
  {#if list.length === 0}
    <p class="muted">No subagents configured.</p>
  {:else}
    <table>
      <thead>
        <tr><th>Source</th></tr>
      </thead>
      <tbody>
        {#each list as entry (sourceText(entry))}
          <tr><td>{sourceText(entry)}</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:catch error}
  <p class="error">{error.message}</p>
{/await}

<style>
  details {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 14px;
  }

  summary {
    cursor: pointer;
  }

  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 480px;
    overflow: auto;
  }

  .state[data-state="in sync"] {
    color: var(--accent);
  }

  .state[data-state="drifted"] {
    color: var(--warning);
  }

  .state[data-state="not synced"] {
    color: var(--danger);
  }

  .state[data-state="disabled"] {
    color: var(--muted);
  }
</style>
