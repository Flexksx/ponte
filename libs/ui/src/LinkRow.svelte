<script lang="ts">
  import type { Snippet } from "svelte";

  let { href, title, children }: { href: string; title: string; children: Snippet } = $props();
</script>

<a class="row" {href}>
  <span class="title">{title}</span>
  {@render children()}
</a>

<style>
  .row {
    display: grid;
    gap: 6px;
    padding: 14px 16px;
    color: var(--ui-text);
    text-decoration: none;
  }

  .row:hover {
    background: var(--ui-surface-hover);
  }

  .title {
    font: 500 14px var(--ui-mono);
  }
</style>
