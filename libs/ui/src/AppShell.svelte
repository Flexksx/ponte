<script lang="ts">
  import Bridge from "@lucide/svelte/icons/bridge";
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";

  type NavItem = { href: string; label: string; icon: LucideIcon; active: boolean };

  let {
    brand,
    homeHref,
    nav,
    children,
  }: { brand: string; homeHref: string; nav: NavItem[]; children: Snippet } = $props();
</script>

<header>
  <div class="bar">
    <a class="brand" href={homeHref}><Bridge size={20} aria-hidden="true" />{brand}</a>
    <nav>
      {#each nav as item (item.href)}
        {@const ItemIcon = item.icon}
        <a href={item.href} class:active={item.active} aria-current={item.active ? "page" : undefined}>
          <ItemIcon size={16} aria-hidden="true" />{item.label}
        </a>
      {/each}
    </nav>
  </div>
</header>

<main>{@render children()}</main>

<style>
  :global(:root) {
    --ui-bg: #fafaf9;
    --ui-surface: #ffffff;
    --ui-surface-hover: #f5f5f4;
    --ui-text: #1c1917;
    --ui-muted: #78716c;
    --ui-border: #e7e5e4;
    --ui-accent: #0f766e;
    --ui-accent-soft: #ccfbf1;
    --ui-success: #15803d;
    --ui-success-soft: #dcfce7;
    --ui-warning: #a16207;
    --ui-warning-soft: #fef9c3;
    --ui-danger: #b91c1c;
    --ui-danger-soft: #fee2e2;
    --ui-radius: 10px;
    --ui-radius-small: 6px;
    --ui-shadow: 0 1px 2px rgb(28 25 23 / 0.06);
    --ui-font: system-ui, -apple-system, "Segoe UI", sans-serif;
    --ui-mono: ui-monospace, "SF Mono", Menlo, monospace;
    color-scheme: light dark;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --ui-bg: #0c0a09;
      --ui-surface: #1c1917;
      --ui-surface-hover: #292524;
      --ui-text: #f5f5f4;
      --ui-muted: #a8a29e;
      --ui-border: #292524;
      --ui-accent: #5eead4;
      --ui-accent-soft: #134e4a;
      --ui-success: #4ade80;
      --ui-success-soft: #14532d;
      --ui-warning: #facc15;
      --ui-warning-soft: #422006;
      --ui-danger: #f87171;
      --ui-danger-soft: #450a0a;
      --ui-shadow: none;
    }
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: var(--ui-bg);
    color: var(--ui-text);
    font: 15px/1.5 var(--ui-font);
    -webkit-font-smoothing: antialiased;
  }

  :global(:focus-visible) {
    outline: 2px solid var(--ui-accent);
    outline-offset: 2px;
  }

  header {
    position: sticky;
    top: 0;
    z-index: 1;
    background: color-mix(in srgb, var(--ui-bg) 85%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--ui-border);
  }

  .bar,
  main {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 28px;
    height: 56px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 17px;
    color: var(--ui-text);
    text-decoration: none;
  }

  nav {
    display: flex;
    gap: 4px;
  }

  nav a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--ui-radius-small);
    color: var(--ui-muted);
    text-decoration: none;
    font-size: 14px;
  }

  nav a:hover {
    color: var(--ui-text);
    background: var(--ui-surface-hover);
  }

  nav a.active {
    color: var(--ui-text);
    background: var(--ui-surface);
    box-shadow: inset 0 0 0 1px var(--ui-border);
  }

  main {
    padding-top: 28px;
    padding-bottom: 64px;
  }
</style>
