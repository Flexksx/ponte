<script lang="ts">
  import type { PullRequestLookup } from "@ponte/core";
  import Alert from "@ponte/ui/Alert.svelte";
  import Badge from "@ponte/ui/Badge.svelte";
  import Button from "@ponte/ui/Button.svelte";
  import Callout from "@ponte/ui/Callout.svelte";
  import CopyField from "@ponte/ui/CopyField.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import Icon from "@ponte/ui/Icon.svelte";
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
  import Tile from "@ponte/ui/Tile.svelte";
  import TileGrid from "@ponte/ui/TileGrid.svelte";
  import { api, load } from "../lib/api";
  import { AGENT_LABELS, formatDateTime } from "../lib/format";
  import { groupLinks } from "../lib/links";
  import {
    AGENT_ICONS,
    CHECKS_LOOKS,
    PULL_REQUEST_LOOKS,
    REVIEW_LOOKS,
  } from "../lib/presentation";
  import { HOME_HREF } from "../lib/route";

  const COLLAPSED_SESSION_COUNT = 10;
  const OPEN_STATES = new Set(["open", "draft"]);

  let { name }: { name: string } = $props();
  let showAllSessions = $state(false);

  const workspace = $derived(load(api.workspaces.show(name)));
  const sessions = $derived(load(api.workspaces.sessions(name)));
  const pullRequests = $derived(load(api.workspaces.pullRequests(name)));
</script>

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
        <Section title="Decisions" icon="decision" count={current.decisions.length}>
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

        {#each groupLinks(current.links) as group (group.heading)}
          <Section title={group.heading} icon={group.icon} count={group.links.length}>
            <TileGrid>
              {#each group.links as link (link.label)}
                {#snippet linkTile(lookup: PullRequestLookup | undefined)}
                  {#snippet badges()}
                    {#if lookup?.kind === "found"}
                      {@const state = PULL_REQUEST_LOOKS[lookup.status.state]}
                      <Badge tone={state.tone} icon={state.icon}>{lookup.status.state}</Badge>
                      {#if OPEN_STATES.has(lookup.status.state) && lookup.status.review}
                        {@const review = REVIEW_LOOKS[lookup.status.review]}
                        <Badge tone={review.tone} icon={review.icon}>{lookup.status.review}</Badge>
                      {/if}
                      {#if OPEN_STATES.has(lookup.status.state) && lookup.status.checks}
                        {@const checks = CHECKS_LOOKS[lookup.status.checks]}
                        <Badge tone={checks.tone} icon={checks.icon}>checks {lookup.status.checks}</Badge>
                      {/if}
                    {:else if lookup?.kind === "unavailable"}
                      <Badge tone="warning">{lookup.reason}</Badge>
                    {/if}
                  {/snippet}
                  <Tile
                    icon={group.icon}
                    label={link.label}
                    labelStyle={link.href === null ? "code" : "plain"}
                    href={link.href ?? undefined}
                    title={lookup?.kind === "found" ? lookup.status.title : ""}
                    note={link.note}
                    footer={lookup === undefined ? undefined : badges}
                  />
                {/snippet}

                {#if link.kind === "pull-request" && link.href !== null}
                  {#await pullRequests}
                    {@render linkTile(undefined)}
                  {:then lookups}
                    {@render linkTile(lookups.find(candidate => candidate.url === link.href))}
                  {:catch error}
                    {@render linkTile({ kind: "unavailable", url: link.href, reason: error.message })}
                  {/await}
                {:else}
                  {@render linkTile(undefined)}
                {/if}
              {/each}
            </TileGrid>
          </Section>
        {:else}
          <Section title="Links" icon="world">
            <EmptyState><Text>No links yet.</Text></EmptyState>
          </Section>
        {/each}
      {/snippet}

      {#snippet aside()}
        <Section title="Sessions" icon="sessions">
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
                      <Row justify="start">
                        <Icon name={AGENT_ICONS[session.agent]} size={16} />
                        <Text size="small">{AGENT_LABELS[session.agent]}</Text>
                      </Row>
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
