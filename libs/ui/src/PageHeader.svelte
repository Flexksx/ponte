<script lang="ts">
  import ArrowLeft from "@tabler/icons-svelte-runes/icons/arrow-left";

  type Back = { href: string; label: string };

  let { title, description, back }: { title: string; description: string; back?: Back } =
    $props();
</script>

<div class="page-header">
  {#if back}
    <a class="back" href={back.href}><ArrowLeft size={14} stroke={1.5} aria-hidden="true" />{back.label}</a>
  {/if}
  <h1>{title}</h1>
  <p>{description}</p>
</div>

<style>
  .page-header {
    display: grid;
    gap: 4px;
    max-width: 72ch;
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    margin-bottom: 10px;
    color: var(--ui-muted);
    text-decoration: none;
  }

  .back:hover {
    color: var(--ui-text);
  }

  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: var(--ui-muted);
    font-size: 15px;
  }
</style>
