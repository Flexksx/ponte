<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";

  let {
    title,
    icon: SectionIcon,
    count,
    children,
  }: { title: string; icon: LucideIcon; count?: number; children: Snippet } = $props();
</script>

<section>
  <h2>
    <SectionIcon size={15} aria-hidden="true" />
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
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ui-muted);
  }

  .count {
    padding: 0 7px;
    border-radius: 999px;
    background: var(--ui-surface-hover);
    font-size: 11px;
    letter-spacing: 0;
  }
</style>
