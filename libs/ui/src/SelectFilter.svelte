<script lang="ts">
  import Check from "@tabler/icons-svelte-runes/icons/check";
  import Selector from "@tabler/icons-svelte-runes/icons/selector";
  import { Select } from "bits-ui";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  type Option = { value: string; count: number };

  const ALL = "*";
  const CONTENT_OFFSET_PX = 4;

  let {
    label,
    icon,
    options,
    selected,
    onselect,
  }: {
    label: string;
    icon: IconName;
    options: Option[];
    selected: string | null;
    onselect: (value: string | null) => void;
  } = $props();

  const items = $derived([
    { value: ALL, label: `All (${options.length})` },
    ...options.map(option => ({ value: option.value, label: `${option.value} (${option.count})` })),
  ]);
  const selectedLabel = $derived(
    items.find(item => item.value === (selected ?? ALL))?.label ?? "",
  );
</script>

<div class="filter">
  <span class="label"><Icon name={icon} size={15} tone="neutral" />{label}</span>
  <Select.Root
    type="single"
    value={selected ?? ALL}
    onValueChange={value => onselect(value === ALL ? null : value)}
    {items}
  >
    <Select.Trigger aria-label={label}>
      {#snippet child({ props })}
        <button {...props} class="trigger">
          <span>{selectedLabel}</span><Selector size={14} stroke={1.5} aria-hidden="true" />
        </button>
      {/snippet}
    </Select.Trigger>
    <Select.Portal>
      <Select.Content forceMount sideOffset={CONTENT_OFFSET_PX}>
        {#snippet child({ wrapperProps, props, open })}
          {#if open}
            <div {...wrapperProps}>
              <div {...props} class="content">
                {#each items as item (item.value)}
                  <Select.Item value={item.value} label={item.label}>
                    {#snippet child({ props: itemProps, selected: isSelected, highlighted })}
                      <div {...itemProps} class="item" class:highlighted>
                        <span>{item.label}</span>
                        {#if isSelected}<Check size={14} stroke={1.5} aria-hidden="true" />{/if}
                      </div>
                    {/snippet}
                  </Select.Item>
                {/each}
              </div>
            </div>
          {/if}
        {/snippet}
      </Select.Content>
    </Select.Portal>
  </Select.Root>
</div>

<style>
  .filter {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 116px;
    color: var(--ui-muted);
    font-size: 13px;
  }

  .trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 280px;
    padding: 4px 8px 4px 10px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    background: var(--ui-surface);
    color: var(--ui-text);
    font: 13px var(--ui-mono);
    cursor: pointer;
  }

  .trigger:hover {
    background: var(--ui-surface-hover);
  }

  .content {
    min-width: var(--bits-select-anchor-width);
    max-height: 320px;
    overflow-y: auto;
    padding: 4px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    background: var(--ui-surface);
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.12);
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 8px;
    border-radius: 4px;
    font: 13px var(--ui-mono);
    cursor: pointer;
  }

  .item.highlighted {
    background: var(--ui-surface-hover);
  }
</style>
