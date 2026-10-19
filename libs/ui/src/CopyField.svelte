<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Copy from "@lucide/svelte/icons/copy";
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

<div class="field">
  <code>{value}</code>
  <Tooltip.Provider delayDuration={TOOLTIP_DELAY_MS}>
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <button {...props} type="button" onclick={copy} class:copied>
            {#if copied}
              <Check size={14} aria-hidden="true" />Copied
            {:else}
              <Copy size={14} aria-hidden="true" />Copy
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
</div>

<style>
  .field {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-small);
    background: var(--ui-bg);
    overflow: hidden;
  }

  code {
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    font: 12px/1.6 var(--ui-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    border: none;
    border-left: 1px solid var(--ui-border);
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
    border-radius: var(--ui-radius-small);
    background: var(--ui-text);
    color: var(--ui-bg);
    font: 12px/1.5 var(--ui-mono);
    overflow-wrap: anywhere;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.18);
  }
</style>
