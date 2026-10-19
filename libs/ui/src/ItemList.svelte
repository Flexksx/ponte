<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<ul>{@render children()}</ul>

<style>
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    overflow: hidden;
  }
</style>
