<script lang="ts">
  import type { Snippet } from "svelte";

  type Tone = "neutral" | "success" | "warning" | "danger";

  let { tone, children }: { tone: Tone; children: Snippet } = $props();
</script>

<span class={tone}>{@render children()}</span>

<style>
  span {
    display: inline-block;
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
