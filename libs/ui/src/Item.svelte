<script lang="ts">
  let { label, meta }: { label: string; meta: string } = $props();
</script>

<li>
  <span class="meta">{meta}</span>
  <span class="label">{label}</span>
</li>

<style>
  li {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--ui-border);
  }

  li:last-child {
    border-bottom: none;
  }

  .meta {
    flex: none;
    color: var(--ui-muted);
    font: 12px/1.5 var(--ui-mono);
    font-variant-numeric: tabular-nums;
  }

  .label {
    min-width: 0;
    overflow-wrap: anywhere;
  }
</style>
