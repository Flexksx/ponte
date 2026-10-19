<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div>{@render children()}</div>

<style>
  div {
    padding: 16px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    color: var(--ui-muted);
  }
</style>
