<script lang="ts">
  import type { Snippet } from "svelte";

  let { title, count, children }: { title: string; count: number; children: Snippet } = $props();
</script>

<div class="subsection">
  <h3>{title}<span class="count">{count}</span></h3>
  {@render children()}
</div>

<style>
  .subsection {
    display: grid;
    gap: 6px;
  }

  h3 {
    display: flex;
    gap: 6px;
    margin: 0;
    color: var(--ui-muted);
    font-size: 13px;
    font-weight: 500;
  }

  .count {
    font-variant-numeric: tabular-nums;
  }
</style>
