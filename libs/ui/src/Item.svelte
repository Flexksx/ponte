<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";

  type LabelStyle = "plain" | "code";

  let {
    label,
    labelStyle = "plain",
    href,
    note = "",
    meta = "",
  }: {
    label: string;
    labelStyle?: LabelStyle;
    href?: string;
    note?: string;
    meta?: string;
  } = $props();
</script>

<li>
  {#if meta !== ""}<span class="meta">{meta}</span>{/if}
  <span class="body">
    {#if href}
      <a {href} target="_blank" rel="noopener noreferrer" class={labelStyle}>
        {label}<ExternalLink size={12} aria-hidden="true" />
      </a>
    {:else}
      <span class="label {labelStyle}">{label}</span>
    {/if}
    {#if note !== ""}<span class="note">{note}</span>{/if}
  </span>
</li>

<style>
  li {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--ui-border);
  }

  li:last-child {
    border-bottom: none;
  }

  .meta {
    flex: none;
    color: var(--ui-muted);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  .body {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
    min-width: 0;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--ui-accent);
    font-weight: 500;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .code {
    font: 13px/1.5 var(--ui-mono);
    overflow-wrap: anywhere;
  }

  .note {
    color: var(--ui-muted);
    font-size: 14px;
  }
</style>
