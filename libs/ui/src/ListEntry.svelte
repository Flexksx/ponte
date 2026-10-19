<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<li>{@render children()}</li>

<style>
  li {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding: 12px 14px;
    border-bottom: 1px solid var(--ui-border);
  }

  li:last-child {
    border-bottom: none;
  }
</style>
