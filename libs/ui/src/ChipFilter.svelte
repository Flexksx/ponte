<script lang="ts">
  import { ToggleGroup } from "bits-ui";
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  type Option = { value: string; count: number };

  const ALL = "*";

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

  const choose = (value: string) => onselect(value === ALL || value === "" ? null : value);
</script>

<ToggleGroup.Root type="single" value={selected ?? ALL} onValueChange={choose}>
  {#snippet child({ props })}
    <div {...props} class="filter" aria-label={label}>
      <span class="label"><Icon name={icon} size={15} tone="neutral" />{label}</span>
      <ToggleGroup.Item value={ALL}>
        {#snippet child({ props: itemProps })}
          <button {...itemProps} class="chip">All</button>
        {/snippet}
      </ToggleGroup.Item>
      {#each options as option (option.value)}
        <ToggleGroup.Item value={option.value}>
          {#snippet child({ props: itemProps })}
            <button {...itemProps} class="chip">
              {option.value}<span class="count">{option.count}</span>
            </button>
          {/snippet}
        </ToggleGroup.Item>
      {/each}
    </div>
  {/snippet}
</ToggleGroup.Root>

<style>
  .filter {
    display: flex;
    flex-wrap: wrap;
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

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    background: var(--ui-surface);
    color: var(--ui-text);
    font: 13px var(--ui-font);
    cursor: pointer;
  }

  .chip:hover {
    background: var(--ui-surface-hover);
  }

  .chip[data-state="on"] {
    border-color: var(--ui-text);
    background: var(--ui-text);
    color: var(--ui-bg);
  }

  .count {
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }
</style>
