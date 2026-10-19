<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";

  type Back = { href: string; label: string };

  let { title, description, back }: { title: string; description: string; back?: Back } =
    $props();
</script>

<div class="page-header">
  {#if back}
    <a class="back" href={back.href}><ArrowLeft size={15} aria-hidden="true" />{back.label}</a>
  {/if}
  <h1>{title}</h1>
  <p>{description}</p>
</div>

<style>
  .page-header {
    display: grid;
    gap: 4px;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    margin-bottom: 8px;
    color: var(--ui-muted);
    font-size: 14px;
    text-decoration: none;
  }

  .back:hover {
    color: var(--ui-text);
  }

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: var(--ui-muted);
    font-size: 16px;
  }
</style>
