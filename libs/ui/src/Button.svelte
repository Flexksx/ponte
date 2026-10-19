<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";

  let {
    icon: ButtonIcon,
    onclick,
    children,
  }: { icon: LucideIcon; onclick: () => void; children: Snippet } = $props();
</script>

<button type="button" {onclick}><ButtonIcon size={15} aria-hidden="true" />{@render children()}</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    gap: 6px;
    padding: 7px 12px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-small);
    background: var(--ui-surface);
    color: var(--ui-text);
    font: 500 13px var(--ui-font);
    cursor: pointer;
  }

  button:hover {
    background: var(--ui-surface-hover);
  }
</style>
