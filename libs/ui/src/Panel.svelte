<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div>{@render children()}</div>

<style>
  div {
    display: grid;
    gap: 8px;
    min-width: 0;
    padding: 14px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    box-shadow: var(--ui-shadow);
  }
</style>
