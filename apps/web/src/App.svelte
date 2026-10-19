<script lang="ts">
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import Settings2 from "@lucide/svelte/icons/settings-2";
  import AppShell from "@ponte/ui/AppShell.svelte";
  import { HOME_HREF, parseRoute, SETUP_HREF } from "./lib/route";
  import SetupPage from "./pages/SetupPage.svelte";
  import WorkspacePage from "./pages/WorkspacePage.svelte";
  import WorkspacesPage from "./pages/WorkspacesPage.svelte";

  let hash = $state(location.hash);
  const route = $derived(parseRoute(hash));
  const nav = $derived([
    { href: HOME_HREF, label: "Workspaces", icon: LayoutGrid, active: route.page !== "setup" },
    { href: SETUP_HREF, label: "Setup", icon: Settings2, active: route.page === "setup" },
  ]);
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

<AppShell brand="ponte" homeHref={HOME_HREF} {nav}>
  {#if route.page === "workspace"}
    {#key route.name}
      <WorkspacePage name={route.name} />
    {/key}
  {:else if route.page === "setup"}
    <SetupPage />
  {:else}
    <WorkspacesPage />
  {/if}
</AppShell>
