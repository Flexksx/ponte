<script lang="ts">
  import type { Snippet } from "svelte";

  let { columns, children }: { columns: string[]; children: Snippet } = $props();
</script>

<div class="frame">
  <table>
    <thead>
      <tr>
        {#each columns as column (column)}<th>{column}</th>{/each}
      </tr>
    </thead>
    <tbody>{@render children()}</tbody>
  </table>
</div>

<style>
  .frame {
    overflow-x: auto;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  th,
  tbody :global(td) {
    padding: 10px 14px;
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid var(--ui-border);
    overflow-wrap: break-word;
  }

  th {
    font-size: 12px;
    font-weight: 600;
    color: var(--ui-muted);
    background: var(--ui-bg);
  }

  tbody :global(tr:last-child td) {
    border-bottom: none;
  }

  tbody :global(tr:hover td) {
    background: var(--ui-surface-hover);
  }
</style>
