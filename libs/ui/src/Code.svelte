<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<code>{@render children()}</code>

<style>
  code {
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--ui-surface-hover);
    font: 13px/1.5 var(--ui-mono);
  }
</style>
