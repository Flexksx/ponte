<script lang="ts">
  import Alert from "@ponte/ui/Alert.svelte";
  import Badge from "@ponte/ui/Badge.svelte";
  import Callout from "@ponte/ui/Callout.svelte";
  import ChipFilter from "@ponte/ui/ChipFilter.svelte";
  import Code from "@ponte/ui/Code.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import LinkRow from "@ponte/ui/LinkRow.svelte";
  import Loading from "@ponte/ui/Loading.svelte";
  import PageHeader from "@ponte/ui/PageHeader.svelte";
  import Row from "@ponte/ui/Row.svelte";
  import SelectFilter from "@ponte/ui/SelectFilter.svelte";
  import RowList from "@ponte/ui/RowList.svelte";
  import Stack from "@ponte/ui/Stack.svelte";
  import Text from "@ponte/ui/Text.svelte";
  import { api, load } from "../lib/api";
  import {
    type Filters,
    matchesFilters,
    NO_FILTERS,
    organizationOptions,
    repositoryLabel,
    repositoryOptions,
    tagOptions,
  } from "../lib/filters";
  import { countOf, relativeTime } from "../lib/format";
  import { workspaceHref } from "../lib/route";

  const overview = load(api.workspaces.overview());
  let filters = $state<Filters>(NO_FILTERS);
</script>

<Stack gap="large">
  <PageHeader title="Workspaces" description="One per effort. Agents keep them up to date." />

  {#await overview}
    <Loading label="Loading workspaces…" />
  {:then entries}
    {#if entries.length === 0}
      <EmptyState>
        <Text>
          No workspaces yet. An agent creates one with <Code>workspace_create</Code> or
          <Code>ponte ws new</Code>.
        </Text>
      </EmptyState>
    {:else}
      {@const visible = entries.filter(entry => matchesFilters(entry, filters))}
      <Stack gap="small">
        <ChipFilter
          label="Tag"
          icon="tag"
          options={tagOptions(entries)}
          selected={filters.tag}
          onselect={tag => (filters = { ...filters, tag })}
        />
        <ChipFilter
          label="Organization"
          icon="organization"
          options={organizationOptions(entries)}
          selected={filters.organization}
          onselect={organization => (filters = { ...filters, organization })}
        />
        <SelectFilter
          label="Repository"
          icon="repository"
          options={repositoryOptions(entries)}
          selected={filters.repository}
          onselect={repository => (filters = { ...filters, repository })}
        />
      </Stack>

      {#if visible.length === 0}
        <EmptyState><Text>No workspace matches these filters.</Text></EmptyState>
      {:else}
        <Text tone="muted" size="small">{countOf(visible.length, "workspace")} of {entries.length}</Text>
        <RowList>
          {#each visible as entry (entry.workspace.name)}
            <LinkRow href={workspaceHref(entry.workspace.name)} title={entry.workspace.name}>
              <Text tone="muted" size="small">
                {entry.lastActiveAt === null ? "No session yet" : `Active ${relativeTime(entry.lastActiveAt)}`}
              </Text>
              <Text tone="muted">{entry.workspace.goal}</Text>
              {#if entry.workspace.next !== ""}
                <Callout label="Next">{entry.workspace.next}</Callout>
              {/if}
              <Row justify="start">
                {#each entry.workspace.tags as tag (tag)}
                  <Badge tone="accent" icon="tag">{tag}</Badge>
                {/each}
                {#each entry.repositories as repository (repositoryLabel(repository))}
                  <Badge tone="neutral" icon="github">{repositoryLabel(repository)}</Badge>
                {/each}
              </Row>
            </LinkRow>
          {/each}
        </RowList>
      {/if}
    {/if}
  {:catch error}
    <Alert message={error.message} />
  {/await}
</Stack>
