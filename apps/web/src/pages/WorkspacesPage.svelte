<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import FolderGit2 from "@lucide/svelte/icons/folder-git-2";
  import Inbox from "@lucide/svelte/icons/inbox";
  import Link2 from "@lucide/svelte/icons/link-2";
  import ListChecks from "@lucide/svelte/icons/list-checks";
  import Alert from "@ponte/ui/Alert.svelte";
  import Badge from "@ponte/ui/Badge.svelte";
  import Callout from "@ponte/ui/Callout.svelte";
  import Card from "@ponte/ui/Card.svelte";
  import CardGrid from "@ponte/ui/CardGrid.svelte";
  import Code from "@ponte/ui/Code.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import Loading from "@ponte/ui/Loading.svelte";
  import PageHeader from "@ponte/ui/PageHeader.svelte";
  import Row from "@ponte/ui/Row.svelte";
  import Stack from "@ponte/ui/Stack.svelte";
  import Text from "@ponte/ui/Text.svelte";
  import { api, load } from "../lib/api";
  import { workspaceHref } from "../lib/route";

  const workspaces = load(api.workspaces.list());
</script>

<Stack gap="large">
  <PageHeader title="Workspaces" description="One per effort. Agents keep them up to date." />

  {#await workspaces}
    <Loading label="Loading workspaces…" />
  {:then list}
    {#if list.length === 0}
      <EmptyState icon={Inbox}>
        <Text>
          No workspaces yet. An agent creates one with <Code>workspace_create</Code> or
          <Code>ponte ws new</Code>.
        </Text>
      </EmptyState>
    {:else}
      <CardGrid>
        {#each list as workspace (workspace.name)}
          <Card href={workspaceHref(workspace.name)} title={workspace.name} icon={FolderGit2}>
            <Text tone="muted">{workspace.goal}</Text>
            {#if workspace.next !== ""}
              <Callout icon={ArrowRight} label="Next">{workspace.next}</Callout>
            {/if}
            <Row justify="start">
              <Badge tone="neutral" icon={Link2}>{workspace.links.length} links</Badge>
              <Badge tone="neutral" icon={ListChecks}>{workspace.decisions.length} decisions</Badge>
            </Row>
          </Card>
        {/each}
      </CardGrid>
    {/if}
  {:catch error}
    <Alert message={error.message} />
  {/await}
</Stack>
