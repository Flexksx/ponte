<script lang="ts">
  import type { Snippet } from "svelte";

  let { title, count, children }: { title: string; count?: number; children: Snippet } = $props();
</script>

<section>
  <h2>{title}{#if count !== undefined}<span class="count">{count}</span>{/if}</h2>
  {@render children()}
</section>

<style>
  section {
    display: grid;
    gap: 10px;
  }

  h2 {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .count {
    color: var(--ui-muted);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
</style>
