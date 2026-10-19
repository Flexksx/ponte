<script lang="ts">
  import Alert from "@ponte/ui/Alert.svelte";
  import Badge from "@ponte/ui/Badge.svelte";
  import Button from "@ponte/ui/Button.svelte";
  import Callout from "@ponte/ui/Callout.svelte";
  import CopyField from "@ponte/ui/CopyField.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import Item from "@ponte/ui/Item.svelte";
  import ItemList from "@ponte/ui/ItemList.svelte";
  import ListEntry from "@ponte/ui/ListEntry.svelte";
  import Loading from "@ponte/ui/Loading.svelte";
  import PageHeader from "@ponte/ui/PageHeader.svelte";
  import Row from "@ponte/ui/Row.svelte";
  import Section from "@ponte/ui/Section.svelte";
  import SplitLayout from "@ponte/ui/SplitLayout.svelte";
  import Stack from "@ponte/ui/Stack.svelte";
  import Text from "@ponte/ui/Text.svelte";
  import { api, load } from "../lib/api";
  import { AGENT_LABELS, formatDateTime } from "../lib/format";
  import { groupLinks } from "../lib/links";
  import { CHECKS_TONES, PULL_REQUEST_TONES, REVIEW_TONES } from "../lib/presentation";
  import { HOME_HREF } from "../lib/route";

  const COLLAPSED_SESSION_COUNT = 10;
  const OPEN_STATES = new Set(["open", "draft"]);

  let { name }: { name: string } = $props();
  let showAllSessions = $state(false);

  const workspace = $derived(load(api.workspaces.show(name)));
  const sessions = $derived(load(api.workspaces.sessions(name)));
  const pullRequests = $derived(load(api.workspaces.pullRequests(name)));
</script>

{#snippet pullRequestState(url: string)}
  {#await pullRequests then lookups}
    {@const lookup = lookups.find(candidate => candidate.url === url)}
    {#if lookup?.kind === "found"}
      <Badge tone={PULL_REQUEST_TONES[lookup.status.state]}>{lookup.status.state}</Badge>
      {#if OPEN_STATES.has(lookup.status.state)}
        {#if lookup.status.review}
          <Badge tone={REVIEW_TONES[lookup.status.review]}>{lookup.status.review}</Badge>
        {/if}
        {#if lookup.status.checks}
          <Badge tone={CHECKS_TONES[lookup.status.checks]}>checks {lookup.status.checks}</Badge>
        {/if}
      {/if}
    {:else if lookup?.kind === "unavailable"}
      <Badge tone="warning">{lookup.reason}</Badge>
    {/if}
  {:catch error}
    <Badge tone="warning">{error.message}</Badge>
  {/await}
{/snippet}

<Stack gap="large">
  {#await workspace}
    <Loading label="Loading workspace…" />
  {:then current}
    <PageHeader
      title={current.name}
      description={current.goal}
      back={{ href: HOME_HREF, label: "Workspaces" }}
    />
    {#if current.next !== ""}
      <Callout label="Next">{current.next}</Callout>
    {/if}

    <SplitLayout>
      {#snippet main()}
        {#each groupLinks(current.links) as group (group.heading)}
          <Section title={group.heading} count={group.links.length}>
            <ItemList>
              {#each group.links as link (link.label)}
                <Item
                  label={link.label}
                  labelStyle={link.href === null ? "code" : "plain"}
                  href={link.href ?? undefined}
                  note={link.note}
                >
                  {#if link.kind === "pull-request" && link.href !== null}
                    {@render pullRequestState(link.href)}
                  {/if}
                </Item>
              {/each}
            </ItemList>
          </Section>
        {:else}
          <Section title="Links">
            <EmptyState><Text>No links yet.</Text></EmptyState>
          </Section>
        {/each}

        <Section title="Decisions" count={current.decisions.length}>
          {#if current.decisions.length === 0}
            <EmptyState><Text>No decisions recorded.</Text></EmptyState>
          {:else}
            <ItemList>
              {#each current.decisions.toReversed() as decision, index (index)}
                <Item meta={decision.date} label={decision.text} />
              {/each}
            </ItemList>
          {/if}
        </Section>
      {/snippet}

      {#snippet aside()}
        <Section title="Sessions">
          {#await sessions}
            <Loading label="Reading agent sessions…" />
          {:then list}
            {#if list.length === 0}
              <EmptyState>
                <Text>No Claude Code or pi session ran in this workspace's folders.</Text>
              </EmptyState>
            {:else}
              <ItemList>
                {#each showAllSessions ? list : list.slice(0, COLLAPSED_SESSION_COUNT) as session (session.id)}
                  <ListEntry>
                    <Row justify="between">
                      <Text size="small">{AGENT_LABELS[session.agent]}</Text>
                      <Text tone="muted" size="small">{formatDateTime(session.startedAt)}</Text>
                    </Row>
                    <Text>{session.title}</Text>
                    <CopyField value={session.resume} />
                  </ListEntry>
                {/each}
              </ItemList>
              {#if list.length > COLLAPSED_SESSION_COUNT}
                <Button onclick={() => (showAllSessions = !showAllSessions)}>
                  {showAllSessions ? "Show fewer" : `Show all ${list.length}`}
                </Button>
              {/if}
            {/if}
          {:catch error}
            <Alert message={error.message} />
          {/await}
        </Section>
      {/snippet}
    </SplitLayout>
  {:catch error}
    <Alert message={error.message} />
  {/await}
</Stack>
