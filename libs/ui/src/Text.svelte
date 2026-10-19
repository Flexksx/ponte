<script lang="ts">
  import type { Snippet } from "svelte";

  type Tone = "default" | "muted";
  type Size = "default" | "small";

  let {
    tone = "default",
    size = "default",
    children,
  }: { tone?: Tone; size?: Size; children: Snippet } = $props();
</script>

<p class="{tone} {size}">{@render children()}</p>

<style>
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .muted {
    color: var(--ui-muted);
  }

  .small {
    font-size: 13px;
  }
</style>
