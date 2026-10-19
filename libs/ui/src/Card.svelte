<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";

  let {
    href,
    title,
    icon: CardIcon,
    children,
  }: { href: string; title: string; icon: LucideIcon; children: Snippet } = $props();
</script>

<a class="card" {href}>
  <span class="title">
    <span class="icon"><CardIcon size={18} aria-hidden="true" /></span>
    <span class="name">{title}</span>
    <span class="chevron"><ChevronRight size={16} aria-hidden="true" /></span>
  </span>
  {@render children()}
</a>

<style>
  .card {
    display: grid;
    align-content: start;
    gap: 10px;
    padding: 16px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    box-shadow: var(--ui-shadow);
    color: var(--ui-text);
    text-decoration: none;
    transition: border-color 120ms ease, transform 120ms ease;
  }

  .card:hover {
    border-color: var(--ui-accent);
    transform: translateY(-1px);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--ui-accent-soft);
    color: var(--ui-accent);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .chevron {
    display: flex;
    color: var(--ui-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }

    .card:hover {
      transform: none;
    }
  }
</style>
