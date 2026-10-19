<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { Snippet } from "svelte";

  let { summary, children }: { summary: string; children: Snippet } = $props();
</script>

<details>
  <summary><ChevronRight size={16} aria-hidden="true" />{summary}</summary>
  <div class="content">{@render children()}</div>
</details>

<style>
  details {
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
  }

  summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary > :global(svg) {
    color: var(--ui-muted);
    transition: transform 120ms ease;
  }

  details[open] summary > :global(svg) {
    transform: rotate(90deg);
  }

  .content {
    padding: 0 14px 14px;
  }
</style>
