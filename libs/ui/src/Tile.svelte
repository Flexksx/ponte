<script lang="ts">
  import ArrowUpRight from "@tabler/icons-svelte-runes/icons/arrow-up-right";
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  type LabelStyle = "plain" | "code";

  let {
    icon,
    label,
    labelStyle = "plain",
    href,
    title = "",
    note = "",
    footer,
  }: {
    icon: IconName;
    label: string;
    labelStyle?: LabelStyle;
    href?: string;
    title?: string;
    note?: string;
    footer?: Snippet;
  } = $props();
</script>

<article>
  <header>
    <Icon name={icon} size={18} />
    {#if href}
      <a {href} target="_blank" rel="noopener noreferrer" class={labelStyle}>
        {label}<ArrowUpRight size={12} stroke={1.5} aria-hidden="true" />
      </a>
    {:else}
      <span class="label {labelStyle}">{label}</span>
    {/if}
  </header>
  {#if title !== ""}<p class="title">{title}</p>{/if}
  {#if note !== ""}<p class="note">{note}</p>{/if}
  {#if footer}<footer>{@render footer()}</footer>{/if}
</article>

<style>
  article {
    display: grid;
    align-content: start;
    gap: 6px;
    min-width: 0;
    padding: 12px 14px;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-width: 0;
    color: var(--ui-accent);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .code {
    font: 13px/1.5 var(--ui-mono);
    overflow-wrap: anywhere;
  }

  .title {
    margin: 0;
    font-weight: 500;
  }

  .note {
    margin: 0;
    color: var(--ui-muted);
    font-size: 13px;
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
</style>
