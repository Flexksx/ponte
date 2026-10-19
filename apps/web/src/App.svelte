<script lang="ts">
  import { HOME_HREF, parseRoute, SETUP_HREF } from "./lib/route";
  import SetupPage from "./pages/SetupPage.svelte";
  import WorkspacePage from "./pages/WorkspacePage.svelte";
  import WorkspacesPage from "./pages/WorkspacesPage.svelte";

  let hash = $state(location.hash);
  const route = $derived(parseRoute(hash));
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

<header>
  <a class="brand" href={HOME_HREF}>ponte</a>
  <nav>
    <a href={HOME_HREF} class:active={route.page !== "setup"}>Workspaces</a>
    <a href={SETUP_HREF} class:active={route.page === "setup"}>Setup</a>
  </nav>
</header>

<main>
  {#if route.page === "workspace"}
    {#key route.name}
      <WorkspacePage name={route.name} />
    {/key}
  {:else if route.page === "setup"}
    <SetupPage />
  {:else}
    <WorkspacesPage />
  {/if}
</main>

<style>
  header,
  main {
    max-width: 1040px;
    margin: 0 auto;
    padding: 0 16px;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 28px;
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .brand {
    font-weight: 700;
    font-size: 18px;
    color: var(--text);
    text-decoration: none;
  }

  nav {
    display: flex;
    gap: 18px;
  }

  nav a {
    color: var(--muted);
    text-decoration: none;
  }

  nav a.active,
  nav a:hover {
    color: var(--text);
  }

  main {
    padding-bottom: 48px;
  }
</style>
