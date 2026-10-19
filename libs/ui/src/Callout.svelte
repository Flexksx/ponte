<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";

  let {
    icon: CalloutIcon,
    label,
    children,
  }: { icon: LucideIcon; label: string; children: Snippet } = $props();
</script>

<div class="callout">
  <CalloutIcon size={16} aria-hidden="true" />
  <div>
    <span class="label">{label}</span>
    <div>{@render children()}</div>
  </div>
</div>

<style>
  .callout {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
    align-items: start;
    padding: 10px 12px;
    border-radius: var(--ui-radius-small);
    background: var(--ui-accent-soft);
    color: var(--ui-text);
    font-size: 14px;
  }

  .callout > :global(svg) {
    margin-top: 2px;
    color: var(--ui-accent);
  }

  .label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ui-accent);
  }
</style>
