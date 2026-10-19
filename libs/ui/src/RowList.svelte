<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="rows">{@render children()}</div>

<style>
  .rows {
    display: grid;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    overflow: hidden;
  }

  .rows > :global(* + *) {
    border-top: 1px solid var(--ui-border);
  }
</style>
