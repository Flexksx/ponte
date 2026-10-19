<script lang="ts">
  const COPIED_DISPLAY_MS = 1500;

  let { command }: { command: string } = $props();
  let copied = $state(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    copied = true;
    setTimeout(() => (copied = false), COPIED_DISPLAY_MS);
  };
</script>

<div class="command">
  <code title={command}>{command}</code>
  <button type="button" onclick={copy}>{copied ? "Copied" : "Copy"}</button>
</div>

<style>
  .command {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  code {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--bg);
    border: 1px solid var(--border);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button {
    flex: none;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--accent);
  }
</style>
