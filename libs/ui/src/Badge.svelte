<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

  let { tone, icon, children }: { tone: Tone; icon?: IconName; children: Snippet } = $props();
</script>

<span class={tone}>
  {#if icon}<Icon name={icon} size={13} />{/if}
  {@render children()}
</span>

<style>
  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 6px;
    border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
  }

  .neutral {
    color: var(--ui-muted);
  }

  .accent {
    color: var(--ui-accent);
  }

  .success {
    color: var(--ui-success);
  }

  .warning {
    color: var(--ui-warning);
  }

  .danger {
    color: var(--ui-danger);
  }
</style>
