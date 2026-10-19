<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import History from "@lucide/svelte/icons/history";
  import Link2 from "@lucide/svelte/icons/link-2";
  import ListChecks from "@lucide/svelte/icons/list-checks";
  import Alert from "@ponte/ui/Alert.svelte";
  import Badge from "@ponte/ui/Badge.svelte";
  import Button from "@ponte/ui/Button.svelte";
  import Callout from "@ponte/ui/Callout.svelte";
  import CopyField from "@ponte/ui/CopyField.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import Item from "@ponte/ui/Item.svelte";
  import ItemList from "@ponte/ui/ItemList.svelte";
  import Loading from "@ponte/ui/Loading.svelte";
  import PageHeader from "@ponte/ui/PageHeader.svelte";
  import Panel from "@ponte/ui/Panel.svelte";
  import Row from "@ponte/ui/Row.svelte";
  import Section from "@ponte/ui/Section.svelte";
  import SplitLayout from "@ponte/ui/SplitLayout.svelte";
  import Stack from "@ponte/ui/Stack.svelte";
  import Text from "@ponte/ui/Text.svelte";
  import { api, load } from "../lib/api";
  import { AGENT_LABELS, formatDateTime } from "../lib/format";
  import { groupLinks } from "../lib/links";
  import { AGENT_ICONS } from "../lib/presentation";
  import { HOME_HREF } from "../lib/route";

  const COLLAPSED_SESSION_COUNT = 10;

  let { name }: { name: string } = $props();
  let showAllSessions = $state(false);

  const workspace = $derived(load(api.workspaces.show(name)));
  const sessions = $derived(load(api.workspaces.sessions(name)));
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
      <Callout icon={ArrowRight} label="Next step">{current.next}</Callout>
    {/if}

    <SplitLayout>
      {#snippet main()}
        {#each groupLinks(current.links) as group (group.heading)}
          <Section title={group.heading} icon={group.icon} count={group.links.length}>
            <ItemList>
              {#each group.links as link (link.label)}
                <Item
                  label={link.label}
                  labelStyle={link.href === null ? "code" : "plain"}
                  href={link.href ?? undefined}
                  note={link.note}
                />
              {/each}
            </ItemList>
          </Section>
        {:else}
          <Section title="Links" icon={Link2}>
            <EmptyState icon={Link2}><Text>No links yet.</Text></EmptyState>
          </Section>
        {/each}

        <Section title="Decisions" icon={ListChecks} count={current.decisions.length}>
          {#if current.decisions.length === 0}
            <EmptyState icon={ListChecks}><Text>No decisions recorded.</Text></EmptyState>
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
        <Section title="Sessions" icon={History}>
          {#await sessions}
            <Loading label="Reading agent sessions…" />
          {:then list}
            {#if list.length === 0}
              <EmptyState icon={History}>
                <Text>No Claude Code or pi session ran in this workspace's folders.</Text>
              </EmptyState>
            {:else}
              {#each showAllSessions ? list : list.slice(0, COLLAPSED_SESSION_COUNT) as session (session.id)}
                <Panel>
                  <Row justify="between">
                    <Badge tone="accent" icon={AGENT_ICONS[session.agent]}>
                      {AGENT_LABELS[session.agent]}
                    </Badge>
                    <Text tone="muted" size="small">{formatDateTime(session.startedAt)}</Text>
                  </Row>
                  <Text>{session.title}</Text>
                  <CopyField value={session.resume} />
                </Panel>
              {/each}
              {#if list.length > COLLAPSED_SESSION_COUNT}
                <Button
                  icon={showAllSessions ? ChevronUp : ChevronDown}
                  onclick={() => (showAllSessions = !showAllSessions)}
                >
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
