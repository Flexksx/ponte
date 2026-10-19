<script lang="ts">
  let { text }: { text: string } = $props();
</script>

<pre>{text}</pre>

<style>
  pre {
    margin: 0;
    max-height: 480px;
    overflow: auto;
    padding: 14px;
    border-radius: var(--ui-radius);
    background: var(--ui-bg);
    font: 13px/1.6 var(--ui-mono);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
