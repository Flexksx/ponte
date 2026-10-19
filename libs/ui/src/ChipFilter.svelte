<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  type Option = { value: string; count: number };

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
</script>

<div class="filter" role="group" aria-label={label}>
  <span class="label"><Icon name={icon} size={15} tone="muted" />{label}</span>
  <button type="button" aria-pressed={selected === null} onclick={() => onselect(null)}>All</button>
  {#each options as option (option.value)}
    <button
      type="button"
      aria-pressed={selected === option.value}
      onclick={() => onselect(selected === option.value ? null : option.value)}
    >
      {option.value}<span class="count">{option.count}</span>
    </button>
  {/each}
</div>

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

  button {
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

  button:hover {
    background: var(--ui-surface-hover);
  }

  button[aria-pressed="true"] {
    border-color: var(--ui-text);
    background: var(--ui-text);
    color: var(--ui-bg);
  }

  .count {
    color: inherit;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }
</style>
