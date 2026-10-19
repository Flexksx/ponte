<script lang="ts">
  let { label }: { label: string } = $props();
</script>

<p role="status">{label}</p>

<style>
  p {
    margin: 0;
    color: var(--ui-muted);
  }
</style>
