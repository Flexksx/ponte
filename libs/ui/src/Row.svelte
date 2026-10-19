<script lang="ts">
  import type { Snippet } from "svelte";

  type Justify = "start" | "between";

  let { justify, children }: { justify: Justify; children: Snippet } = $props();
</script>

<div class={justify}>{@render children()}</div>

<style>
  div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .between {
    justify-content: space-between;
  }
</style>
