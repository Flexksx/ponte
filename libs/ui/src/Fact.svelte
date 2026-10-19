<script lang="ts">
  import type { Snippet } from "svelte";

  let { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="fact">
  <dt>{label}</dt>
  <dd>{@render children()}</dd>
</div>

<style>
  .fact {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--ui-border);
  }

  .fact:last-child {
    border-bottom: none;
  }

  dt {
    color: var(--ui-muted);
    font-size: 13px;
    padding-top: 1px;
  }

  dd {
    display: grid;
    gap: 8px;
    min-width: 0;
    margin: 0;
  }

  @media (max-width: 640px) {
    .fact {
      grid-template-columns: minmax(0, 1fr);
      gap: 4px;
    }
  }
</style>
