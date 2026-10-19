<script lang="ts">
  import type { Snippet } from "svelte";

  let { main, aside }: { main: Snippet; aside: Snippet } = $props();
</script>

<div class="split">
  <div class="main">{@render main()}</div>
  <aside>{@render aside()}</aside>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 40px;
    align-items: start;
  }

  .main,
  aside {
    display: grid;
    gap: 28px;
    min-width: 0;
  }

  @media (max-width: 820px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
