<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";

  type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

  let {
    tone,
    icon: BadgeIcon,
    children,
  }: { tone: Tone; icon?: LucideIcon; children: Snippet } = $props();
</script>

<span class={tone}>
  {#if BadgeIcon}<BadgeIcon size={13} aria-hidden="true" />{/if}
  {@render children()}
</span>

<style>
  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .neutral {
    background: var(--ui-surface-hover);
    color: var(--ui-muted);
  }

  .accent {
    background: var(--ui-accent-soft);
    color: var(--ui-accent);
  }

  .success {
    background: var(--ui-success-soft);
    color: var(--ui-success);
  }

  .warning {
    background: var(--ui-warning-soft);
    color: var(--ui-warning);
  }

  .danger {
    background: var(--ui-danger-soft);
    color: var(--ui-danger);
  }
</style>
