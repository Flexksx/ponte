<script lang="ts">
  import AlertCircle from "@tabler/icons-svelte-runes/icons/alert-circle";

  let { message }: { message: string } = $props();
</script>

<div role="alert"><AlertCircle size={16} stroke={1.5} aria-hidden="true" />{message}</div>

<style>
  div {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--ui-danger) 40%, transparent);
    border-radius: var(--ui-radius);
    color: var(--ui-danger);
  }
</style>
