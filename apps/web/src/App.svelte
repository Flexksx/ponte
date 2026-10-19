<script lang="ts">
  import AppShell from "@ponte/ui/AppShell.svelte";
  import { HOME_HREF, parseRoute, SETUP_HREF } from "./lib/route";
  import SetupPage from "./pages/SetupPage.svelte";
  import WorkspacePage from "./pages/WorkspacePage.svelte";
  import WorkspacesPage from "./pages/WorkspacesPage.svelte";

  let hash = $state(location.hash);
  const route = $derived(parseRoute(hash));

  $effect(() => {
    const follow = () => (hash = location.hash);
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  });
  const nav = $derived([
    { href: HOME_HREF, label: "Workspaces", active: route.page !== "setup" },
    { href: SETUP_HREF, label: "Setup", active: route.page === "setup" },
  ]);
</script>

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
