<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";

  let { message }: { message: string } = $props();
</script>

<div role="alert"><CircleAlert size={16} aria-hidden="true" />{message}</div>

<style>
  div {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--ui-radius-small);
    background: var(--ui-danger-soft);
    color: var(--ui-danger);
    font-size: 14px;
  }
</style>
