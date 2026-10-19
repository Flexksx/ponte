<script lang="ts">
  import type { Snippet } from "svelte";

  type Gap = "small" | "medium" | "large";

  const GAPS: Record<Gap, string> = { small: "8px", medium: "16px", large: "28px" };

  let { gap, children }: { gap: Gap; children: Snippet } = $props();
</script>

<div style:gap={GAPS[gap]}>{@render children()}</div>

<style>
  div {
    display: grid;
    min-width: 0;
  }
</style>
