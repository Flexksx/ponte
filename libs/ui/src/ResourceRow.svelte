<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  type Tone = "inherit" | "neutral" | "accent" | "success" | "warning" | "danger";
  type LabelStyle = "plain" | "code";

  let {
    icon,
    iconTone = "neutral",
    label,
    labelStyle = "plain",
    href,
    detail = "",
    meta = "",
    trailing,
  }: {
    icon: IconName;
    iconTone?: Tone;
    label: string;
    labelStyle?: LabelStyle;
    href?: string;
    detail?: string;
    meta?: string;
    trailing?: Snippet;
  } = $props();
</script>

<li>
  <Icon name={icon} size={16} tone={iconTone} />
  <span class="body">
    {#if href}
      <a {href} target="_blank" rel="noopener noreferrer" class="label {labelStyle}">{label}</a>
    {:else}
      <span class="label {labelStyle}" title={label}>{label}</span>
    {/if}
    {#if detail !== ""}<span class="detail" title={detail}>{detail}</span>{/if}
  </span>
  {#if trailing}<span class="trailing">{@render trailing()}</span>{/if}
  {#if meta !== ""}<span class="meta">{meta}</span>{/if}
</li>

<style>
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 38px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--ui-border);
  }

  li:last-child {
    border-bottom: none;
  }

  .body {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .label {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    color: var(--ui-text);
    white-space: nowrap;
    text-overflow: ellipsis;
    text-decoration: none;
  }

  a.label {
    color: var(--ui-accent);
  }

  a.label:hover {
    text-decoration: underline;
  }

  .code {
    font: 13px/1.5 var(--ui-mono);
  }

  .detail {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    color: var(--ui-muted);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .trailing {
    display: flex;
    flex: none;
    gap: 4px;
  }

  .meta {
    flex: none;
    min-width: 64px;
    color: var(--ui-muted);
    font-size: 12px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 640px) {
    li {
      flex-wrap: wrap;
    }

    .body {
      flex-basis: calc(100% - 26px);
    }
  }
</style>
