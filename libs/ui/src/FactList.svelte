<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<dl>{@render children()}</dl>

<style>
  dl {
    display: grid;
    margin: 0;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
  }
</style>
