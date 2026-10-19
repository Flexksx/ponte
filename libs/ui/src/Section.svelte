<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  let {
    title,
    icon,
    count,
    children,
  }: { title: string; icon: IconName; count?: number; children: Snippet } = $props();
</script>

<section>
  <h2>
    <Icon name={icon} size={17} tone="muted" />
    {title}
    {#if count !== undefined}<span class="count">{count}</span>{/if}
  </h2>
  {@render children()}
</section>

<style>
  section {
    display: grid;
    gap: 10px;
  }

  h2 {
    display: flex;
    align-items: center;
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
