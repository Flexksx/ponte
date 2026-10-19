<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";

  let { icon: EmptyIcon, children }: { icon: LucideIcon; children: Snippet } = $props();
</script>

<div>
  <EmptyIcon size={22} aria-hidden="true" />
  {@render children()}
</div>

<style>
  div {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 28px 16px;
    border: 1px dashed var(--ui-border);
    border-radius: var(--ui-radius);
    color: var(--ui-muted);
    text-align: center;
    font-size: 14px;
  }
</style>
