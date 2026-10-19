<script lang="ts">
  import type { Snippet } from "svelte";

  let { onclick, children }: { onclick: () => void; children: Snippet } = $props();
</script>

<button type="button" {onclick}>{@render children()}</button>

<style>
  button {
    justify-self: start;
    padding: 6px 12px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    background: var(--ui-surface);
    color: var(--ui-text);
    font: 500 13px var(--ui-font);
    cursor: pointer;
  }

  button:hover {
    background: var(--ui-surface-hover);
  }

  button:active {
    transform: translateY(1px);
  }
</style>
