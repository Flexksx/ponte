<script lang="ts">
  import Alert from "@ponte/ui/Alert.svelte";
  import Callout from "@ponte/ui/Callout.svelte";
  import Code from "@ponte/ui/Code.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import LinkRow from "@ponte/ui/LinkRow.svelte";
  import Loading from "@ponte/ui/Loading.svelte";
  import PageHeader from "@ponte/ui/PageHeader.svelte";
  import RowList from "@ponte/ui/RowList.svelte";
  import Stack from "@ponte/ui/Stack.svelte";
  import Text from "@ponte/ui/Text.svelte";
  import { api, load } from "../lib/api";
  import { countOf } from "../lib/format";
  import { workspaceHref } from "../lib/route";

  const workspaces = load(api.workspaces.list());
</script>

<Stack gap="large">
  <PageHeader title="Workspaces" description="One per effort. Agents keep them up to date." />

  {#await workspaces}
    <Loading label="Loading workspaces…" />
  {:then list}
    {#if list.length === 0}
      <EmptyState>
        <Text>
          No workspaces yet. An agent creates one with <Code>workspace_create</Code> or
          <Code>ponte ws new</Code>.
        </Text>
      </EmptyState>
    {:else}
      <RowList>
        {#each list as workspace (workspace.name)}
          <LinkRow href={workspaceHref(workspace.name)} title={workspace.name}>
            <Text tone="muted">{workspace.goal}</Text>
            {#if workspace.next !== ""}
              <Callout label="Next">{workspace.next}</Callout>
            {/if}
            <Text tone="muted" size="small">
              {countOf(workspace.links.length, "link")}, {countOf(workspace.decisions.length, "decision")}
            </Text>
          </LinkRow>
        {/each}
      </RowList>
    {/if}
  {:catch error}
    <Alert message={error.message} />
  {/await}
</Stack>
