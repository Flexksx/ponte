<script lang="ts">
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";

  let { label }: { label: string } = $props();
</script>

<div role="status"><span class="spin"><LoaderCircle size={16} aria-hidden="true" /></span>{label}</div>

<style>
  div {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ui-muted);
    font-size: 14px;
  }

  .spin {
    display: flex;
    animation: spin 900ms linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }
  }
</style>
