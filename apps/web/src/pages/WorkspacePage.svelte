<script lang="ts">
  import type { PullRequestLookup, Workspace } from "@ponte/core";
  import Alert from "@ponte/ui/Alert.svelte";
  import Badge from "@ponte/ui/Badge.svelte";
  import Button from "@ponte/ui/Button.svelte";
  import Callout from "@ponte/ui/Callout.svelte";
  import CopyButton from "@ponte/ui/CopyButton.svelte";
  import CopyField from "@ponte/ui/CopyField.svelte";
  import Disclosure from "@ponte/ui/Disclosure.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import Fact from "@ponte/ui/Fact.svelte";
  import FactList from "@ponte/ui/FactList.svelte";
  import Icon from "@ponte/ui/Icon.svelte";
  import Item from "@ponte/ui/Item.svelte";
  import ItemList from "@ponte/ui/ItemList.svelte";
  import Loading from "@ponte/ui/Loading.svelte";
  import PageHeader from "@ponte/ui/PageHeader.svelte";
  import ResourceRow from "@ponte/ui/ResourceRow.svelte";
  import Row from "@ponte/ui/Row.svelte";
  import Section from "@ponte/ui/Section.svelte";
  import SplitLayout from "@ponte/ui/SplitLayout.svelte";
  import Stack from "@ponte/ui/Stack.svelte";
  import Subsection from "@ponte/ui/Subsection.svelte";
  import Text from "@ponte/ui/Text.svelte";
  import { api, load } from "../lib/api";
  import { AGENT_LABELS, relativeTime } from "../lib/format";
  import { describeLink, LINK_ICONS } from "../lib/links";
  import {
    AGENT_ICONS,
    CHECKS_LOOKS,
    PULL_REQUEST_LANES,
    PULL_REQUEST_LOOKS,
    REVIEW_LOOKS,
  } from "../lib/presentation";
  import { HOME_HREF } from "../lib/route";

  const COLLAPSED_SESSION_COUNT = 6;
  const RECENT_DECISION_COUNT = 3;

  let { name }: { name: string } = $props();
  let showAllSessions = $state(false);

  let changed = $state<Promise<Workspace> | null>(null);
  const workspace = $derived(changed ?? load(api.workspaces.show(name)));
  const sessions = $derived(load(api.workspaces.sessions(name)));
  const pullRequests = $derived(load(api.workspaces.pullRequests(name)));

  const inLane = (lookups: readonly PullRequestLookup[], lane: string) =>
    lookups.filter(lookup => lookup.kind === "found" && lookup.status.lane === lane);
</script>

{#snippet pullRequestRow(lookup: PullRequestLookup)}
  {@const link = describeLink({ target: lookup.url, note: "" })}
  {#if lookup.kind === "found"}
    {@const look = PULL_REQUEST_LOOKS[lookup.status.state]}
    {@const open = lookup.status.lane !== "done"}
    <ResourceRow
      icon={look.icon}
      iconTone={look.tone}
      label={link.label}
      href={lookup.url}
      detail={lookup.status.title}
      meta={relativeTime(lookup.status.updatedAt)}
    >
      {#snippet trailing()}
        {#if open && lookup.status.conflicts}
          <Badge tone="danger">conflicts</Badge>
        {/if}
        {#if open && lookup.status.review}
          {@const review = REVIEW_LOOKS[lookup.status.review]}
          <Badge tone={review.tone} icon={review.icon}>{lookup.status.review}</Badge>
        {/if}
        {#if open && lookup.status.checks}
          {@const checks = CHECKS_LOOKS[lookup.status.checks]}
          <Badge tone={checks.tone} icon={checks.icon}>checks {lookup.status.checks}</Badge>
        {/if}
      {/snippet}
    </ResourceRow>
  {:else}
    <ResourceRow icon="github" label={link.label} href={lookup.url} detail={lookup.reason} />
  {/if}
{/snippet}

<Stack gap="large">
  {#await workspace}
    <Loading label="Loading workspace…" />
  {:then current}
    {@const otherLinks = current.links.map(describeLink).filter(link => link.kind !== "pull-request")}
    {@const prCount = current.links.map(describeLink).filter(link => link.kind === "pull-request").length}
    {@const decisions = current.decisions.toReversed()}
    <Stack gap="medium">
      <PageHeader
        title={current.name}
        description={current.goal}
        back={{ href: HOME_HREF, label: "Workspaces" }}
      />
      <Row justify="between">
        <Row justify="start">
          {#each current.tags as tag (tag)}
            <Badge tone="accent" icon="tag">{tag}</Badge>
          {/each}
        </Row>
        {#if current.doneOn === null}
          <Button onclick={() => (changed = load(api.workspaces.markDone(name)))}>Mark done</Button>
        {:else}
          <Button onclick={() => (changed = load(api.workspaces.reopen(name)))}>Reopen</Button>
        {/if}
      </Row>
      {#if current.doneOn !== null}
        <Callout label="Done">
          Finished on {current.doneOn}. It no longer loads when a session starts in its folders.
        </Callout>
      {/if}
    </Stack>

    <FactList>
      <Fact label="Next">
        {#if current.next === ""}
          <Text tone="muted">No next step recorded.</Text>
        {:else}
          <Text>{current.next}</Text>
        {/if}
      </Fact>
      <Fact label="Continue">
        {#await sessions}
          <Loading label="Finding your last session…" />
        {:then list}
          {@const [latest] = list}
          {#if latest}
            <Row justify="start">
              <Icon name={AGENT_ICONS[latest.agent]} size={16} />
              <Text size="small">{AGENT_LABELS[latest.agent]}, active {relativeTime(latest.lastActiveAt)}</Text>
            </Row>
            <Text>{latest.title}</Text>
            <CopyField value={latest.resume} />
          {:else}
            <Text tone="muted">No session found for this workspace yet.</Text>
          {/if}
        {:catch error}
          <Alert message={error.message} />
        {/await}
      </Fact>
      {#if prCount > 0}
        <Fact label="Pull requests">
          {#await pullRequests}
            <Loading label="Checking {prCount} pull requests…" />
          {:then lookups}
            <Row justify="start">
              {#each PULL_REQUEST_LANES as [lane, laneLabel, tone] (lane)}
                {@const count = inLane(lookups, lane).length}
                {#if count > 0}
                  <Badge {tone}>{count} {laneLabel.toLowerCase()}</Badge>
                {/if}
              {/each}
            </Row>
          {:catch error}
            <Alert message={error.message} />
          {/await}
        </Fact>
      {/if}
    </FactList>

    <SplitLayout>
      {#snippet main()}
        {#if prCount > 0}
          <Section title="Pull requests" icon="github" count={prCount}>
            {#await pullRequests}
              <Loading label="Checking pull requests…" />
            {:then lookups}
              {#each PULL_REQUEST_LANES as [lane, laneLabel] (lane)}
                {@const members = inLane(lookups, lane)}
                {#if members.length > 0 && lane !== "done"}
                  <Subsection title={laneLabel} count={members.length}>
                    <ItemList>
                      {#each members as lookup (lookup.url)}
                        {@render pullRequestRow(lookup)}
                      {/each}
                    </ItemList>
                  </Subsection>
                {:else if members.length > 0}
                  <Disclosure summary="{laneLabel} ({members.length})">
                    <ItemList>
                      {#each members as lookup (lookup.url)}
                        {@render pullRequestRow(lookup)}
                      {/each}
                    </ItemList>
                  </Disclosure>
                {/if}
              {/each}
              {@const unavailable = lookups.filter(lookup => lookup.kind === "unavailable")}
              {#if unavailable.length > 0}
                <Subsection title="State unavailable" count={unavailable.length}>
                  <ItemList>
                    {#each unavailable as lookup (lookup.url)}
                      {@render pullRequestRow(lookup)}
                    {/each}
                  </ItemList>
                </Subsection>
              {/if}
            {:catch error}
              <Alert message={error.message} />
            {/await}
          </Section>
        {/if}

        <Section title="Links" icon="world" count={otherLinks.length}>
          {#if otherLinks.length === 0}
            <EmptyState><Text>No tickets, folders or pages linked.</Text></EmptyState>
          {:else}
            <ItemList>
              {#each otherLinks as link (link.label)}
                <ResourceRow
                  icon={LINK_ICONS[link.kind]}
                  label={link.label}
                  labelStyle={link.href === null ? "code" : "plain"}
                  href={link.href ?? undefined}
                  detail={link.note}
                />
              {/each}
            </ItemList>
          {/if}
        </Section>
      {/snippet}

      {#snippet aside()}
        <Section title="Sessions" icon="sessions">
          {#await sessions}
            <Loading label="Reading agent sessions…" />
          {:then list}
            {#if list.length === 0}
              <EmptyState>
                <Text>No agent session ran in its folders or named its tickets or pull requests.</Text>
              </EmptyState>
            {:else}
              <ItemList>
                {#each showAllSessions ? list : list.slice(0, COLLAPSED_SESSION_COUNT) as session (session.id)}
                  <ResourceRow
                    icon={AGENT_ICONS[session.agent]}
                    iconTone="inherit"
                    label={session.title}
                    meta={relativeTime(session.lastActiveAt)}
                  >
                    {#snippet trailing()}
                      <CopyButton value={session.resume} />
                    {/snippet}
                  </ResourceRow>
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

        <Section title="Decisions" icon="decision" count={decisions.length}>
          {#if decisions.length === 0}
            <EmptyState><Text>No decisions recorded.</Text></EmptyState>
          {:else}
            <ItemList>
              {#each decisions.slice(0, RECENT_DECISION_COUNT) as decision, index (index)}
                <Item meta={decision.date} label={decision.text} />
              {/each}
            </ItemList>
            {#if decisions.length > RECENT_DECISION_COUNT}
              <Disclosure summary="{decisions.length - RECENT_DECISION_COUNT} older decisions">
                <ItemList>
                  {#each decisions.slice(RECENT_DECISION_COUNT) as decision, index (index)}
                    <Item meta={decision.date} label={decision.text} />
                  {/each}
                </ItemList>
              </Disclosure>
            {/if}
          {/if}
        </Section>
      {/snippet}
    </SplitLayout>
  {:catch error}
    <Alert message={error.message} />
  {/await}
</Stack>
