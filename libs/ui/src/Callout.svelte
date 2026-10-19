<script lang="ts">
  import type { Snippet } from "svelte";

  let { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="callout">
  <span class="label">{label}</span>
  <div>{@render children()}</div>
</div>

<style>
  .callout {
    display: grid;
    gap: 2px;
    padding: 2px 0 2px 12px;
    border-left: 2px solid var(--ui-accent);
  }

  .label {
    color: var(--ui-muted);
    font-size: 13px;
    font-weight: 500;
  }
</style>
