<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { IconName } from "./icons";

  type Option = { value: string; count: number };

  const ALL = "";

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

<label class="filter">
  <span class="label"><Icon name={icon} size={15} tone="muted" />{label}</span>
  <select
    value={selected ?? ALL}
    onchange={event => onselect(event.currentTarget.value === ALL ? null : event.currentTarget.value)}
  >
    <option value={ALL}>All ({options.length})</option>
    {#each options as option (option.value)}
      <option value={option.value}>{option.value} ({option.count})</option>
    {/each}
  </select>
</label>

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

  select {
    min-width: 260px;
    padding: 4px 8px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    background: var(--ui-surface);
    color: var(--ui-text);
    font: 13px var(--ui-mono);
  }
</style>
