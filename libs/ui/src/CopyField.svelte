<script lang="ts">
  import CopyButton from "./CopyButton.svelte";

  let { value }: { value: string } = $props();
</script>

<div class="field">
  <code>{value}</code>
  <CopyButton {value} />
</div>

<style>
  .field {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  code {
    flex: 1;
    min-width: 0;
    padding: 4px 10px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    background: var(--ui-bg);
    font: 12px/1.6 var(--ui-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
