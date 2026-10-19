<script lang="ts">
  import Check from "@tabler/icons-svelte-runes/icons/check";
  import Copy from "@tabler/icons-svelte-runes/icons/copy";
  import { Tooltip } from "bits-ui";

  const COPIED_DISPLAY_MS = 1500;
  const TOOLTIP_DELAY_MS = 300;
  const TOOLTIP_OFFSET_PX = 6;

  let { value }: { value: string } = $props();
  let copied = $state(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    copied = true;
    setTimeout(() => (copied = false), COPIED_DISPLAY_MS);
  };
</script>

<Tooltip.Provider delayDuration={TOOLTIP_DELAY_MS}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <button {...props} type="button" onclick={copy} class:copied>
          {#if copied}
            <Check size={13} stroke={1.5} aria-hidden="true" />Copied
          {:else}
            <Copy size={13} stroke={1.5} aria-hidden="true" />Copy
          {/if}
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content forceMount side="top" align="end" sideOffset={TOOLTIP_OFFSET_PX}>
        {#snippet child({ wrapperProps, props, open })}
          {#if open}
            <div {...wrapperProps}>
              <div {...props} class="tooltip">{value}</div>
            </div>
          {/if}
        {/snippet}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>

<style>
  button {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    background: var(--ui-surface);
    color: var(--ui-text);
    font: 500 12px var(--ui-font);
    cursor: pointer;
  }

  button:hover {
    background: var(--ui-surface-hover);
  }

  button.copied {
    color: var(--ui-success);
  }

  .tooltip {
    max-width: min(520px, calc(100vw - 32px));
    padding: 8px 10px;
    border-radius: var(--ui-radius);
    background: var(--ui-text);
    color: var(--ui-bg);
    font: 12px/1.5 var(--ui-mono);
    overflow-wrap: anywhere;
  }
</style>
