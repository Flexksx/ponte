<script lang="ts">
  import ChevronRight from "@tabler/icons-svelte-runes/icons/chevron-right";
  import { Collapsible } from "bits-ui";
  import type { Snippet } from "svelte";

  let { summary, children }: { summary: string; children: Snippet } = $props();
</script>

<div class="disclosure">
  <Collapsible.Root>
    <Collapsible.Trigger>
      {#snippet child({ props })}
        <button {...props} class="trigger">
          <ChevronRight size={14} stroke={1.5} aria-hidden="true" />{summary}
        </button>
      {/snippet}
    </Collapsible.Trigger>
    <Collapsible.Content forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} class="content">{@render children()}</div>
        {/if}
      {/snippet}
    </Collapsible.Content>
  </Collapsible.Root>
</div>

<style>
  .disclosure {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
  }

  .trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 12px 14px;
    border: none;
    background: none;
    color: var(--ui-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .trigger > :global(svg) {
    color: var(--ui-muted);
    transition: transform 120ms ease;
  }

  .trigger[data-state="open"] > :global(svg) {
    transform: rotate(90deg);
  }

  .content {
    padding: 0 14px 14px;
  }

  @media (prefers-reduced-motion: reduce) {
    .trigger > :global(svg) {
      transition: none;
    }
  }
</style>
