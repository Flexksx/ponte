<script lang="ts">
  import "@fontsource-variable/ibm-plex-sans";
  import "@fontsource/ibm-plex-mono/latin-400.css";
  import "@fontsource/ibm-plex-mono/latin-500.css";
  import "@fontsource/ibm-plex-mono/latin-ext-400.css";
  import "@fontsource/ibm-plex-mono/latin-ext-500.css";
  import type { Snippet } from "svelte";

  type NavItem = { href: string; label: string; active: boolean };

  let {
    brand,
    homeHref,
    nav,
    children,
  }: { brand: string; homeHref: string; nav: NavItem[]; children: Snippet } = $props();
</script>

<header>
  <div class="bar">
    <a class="brand" href={homeHref}>{brand}</a>
    <nav>
      {#each nav as item (item.href)}
        <a href={item.href} class:active={item.active} aria-current={item.active ? "page" : undefined}>
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
</header>

<main>{@render children()}</main>

<style>
  :global(:root) {
    --ui-bg: #f8f8f6;
    --ui-surface: #fdfdfc;
    --ui-surface-hover: #f1f1ee;
    --ui-text: #1d1d1b;
    --ui-muted: #67675f;
    --ui-border: #e2e2dd;
    --ui-accent: #2b59c3;
    --ui-success: #1f7a3a;
    --ui-warning: #8f5f00;
    --ui-danger: #b42318;
    --ui-radius: 6px;
    --ui-font: "IBM Plex Sans Variable", system-ui, sans-serif;
    --ui-mono: "IBM Plex Mono", ui-monospace, monospace;
    color-scheme: light dark;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --ui-bg: #131312;
      --ui-surface: #1a1a18;
      --ui-surface-hover: #22221f;
      --ui-text: #ebebe6;
      --ui-muted: #9b9b93;
      --ui-border: #2d2d29;
      --ui-accent: #8fb0ff;
      --ui-success: #73c98a;
      --ui-warning: #dfb44a;
      --ui-danger: #f08a7c;
    }
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: var(--ui-bg);
    color: var(--ui-text);
    font: 14px/1.55 var(--ui-font);
    -webkit-font-smoothing: antialiased;
  }

  :global(:focus-visible) {
    outline: 2px solid var(--ui-accent);
    outline-offset: 2px;
  }

  header {
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-bg);
  }

  .bar,
  main {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .bar {
    display: flex;
    align-items: stretch;
    gap: 32px;
    height: 52px;
  }

  .brand {
    align-self: center;
    font: 600 15px var(--ui-mono);
    color: var(--ui-text);
    text-decoration: none;
  }

  nav {
    display: flex;
    gap: 20px;
  }

  nav a {
    display: flex;
    align-items: center;
    border-bottom: 2px solid transparent;
    color: var(--ui-muted);
    text-decoration: none;
  }

  nav a:hover {
    color: var(--ui-text);
  }

  nav a.active {
    color: var(--ui-text);
    border-bottom-color: var(--ui-text);
  }

  main {
    padding-top: 32px;
    padding-bottom: 64px;
  }
</style>
