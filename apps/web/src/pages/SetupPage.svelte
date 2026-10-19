<script lang="ts">
  import Alert from "@ponte/ui/Alert.svelte";
  import Badge from "@ponte/ui/Badge.svelte";
  import Code from "@ponte/ui/Code.svelte";
  import CodeBlock from "@ponte/ui/CodeBlock.svelte";
  import Disclosure from "@ponte/ui/Disclosure.svelte";
  import EmptyState from "@ponte/ui/EmptyState.svelte";
  import Loading from "@ponte/ui/Loading.svelte";
  import PageHeader from "@ponte/ui/PageHeader.svelte";
  import Row from "@ponte/ui/Row.svelte";
  import Section from "@ponte/ui/Section.svelte";
  import Stack from "@ponte/ui/Stack.svelte";
  import Table from "@ponte/ui/Table.svelte";
  import Text from "@ponte/ui/Text.svelte";
  import { api, load } from "../lib/api";
  import { sourceText } from "../lib/format";
  import { LINK_STATE_TONES } from "../lib/presentation";

  const status = load(api.status());
  const systemPrompt = load(api.readSystemPrompt());
  const skills = load(api.listSkills());
  const subagents = load(api.listSubagents());
</script>

<Stack gap="large">
  <PageHeader title="Setup" description="What ponte links into each agent." />

  <Section title="Agents" icon="agents">
    {#await status}
      <Loading label="Checking agent links…" />
    {:then current}
      {#if current.mode === "global"}
        <Text tone="muted" size="small">
          System prompt file: <Code>{current.report.promptFile}</Code>
        </Text>
        <Table columns={["Agent", "Enabled", "Links", "State"]}>
          {#each current.report.vendors as agent (agent.name)}
            <tr>
              <td>{agent.name}</td>
              <td>{agent.enabled ? "yes" : "no"}</td>
              <td>{agent.linkCount}</td>
              <td><Badge tone={LINK_STATE_TONES[agent.state]}>{agent.state}</Badge></td>
            </tr>
          {/each}
        </Table>
      {:else}
        <Row justify="start">
          <Text>Repo mode: <Code>{current.report.root}</Code>, {current.report.linkCount} links</Text>
          <Badge tone={LINK_STATE_TONES[current.report.state]}>{current.report.state}</Badge>
        </Row>
      {/if}
    {:catch error}
      <Alert message={error.message} />
    {/await}
  </Section>

  <Section title="System prompt" icon="prompt">
    {#await systemPrompt}
      <Loading label="Reading the system prompt…" />
    {:then prompt}
      <Disclosure summary={`Show the prompt every agent gets (${prompt.split("\n").length} lines)`}>
        <CodeBlock text={prompt} />
      </Disclosure>
    {:catch error}
      <Alert message={error.message} />
    {/await}
  </Section>

  {#await skills}
    <Section title="Skills" icon="skills"><Loading label="Listing skills…" /></Section>
  {:then listing}
    <Section title="Skills" icon="skills" count={listing.rows.length}>
      {#if listing.rows.length === 0}
        <EmptyState><Text>No skills configured.</Text></EmptyState>
      {:else}
        <Table columns={["Name", "Type", "Source"]}>
          {#each listing.rows as row (sourceText(row.entry))}
            <tr>
              <td>{row.name ?? "-"}</td>
              <td><Badge tone="neutral">{row.vendored ? "git" : "local"}</Badge></td>
              <td>{sourceText(row.entry)}</td>
            </tr>
          {/each}
        </Table>
      {/if}
    </Section>
  {:catch error}
    <Section title="Skills" icon="skills"><Alert message={error.message} /></Section>
  {/await}

  {#await subagents}
    <Section title="Subagents" icon="subagents"><Loading label="Listing subagents…" /></Section>
  {:then list}
    <Section title="Subagents" icon="subagents" count={list.length}>
      {#if list.length === 0}
        <EmptyState><Text>No subagents configured.</Text></EmptyState>
      {:else}
        <Table columns={["Source"]}>
          {#each list as entry (sourceText(entry))}
            <tr><td>{sourceText(entry)}</td></tr>
          {/each}
        </Table>
      {/if}
    </Section>
  {:catch error}
    <Section title="Subagents" icon="subagents"><Alert message={error.message} /></Section>
  {/await}
</Stack>
