<script lang="ts">
  import { GLYPHS, type IconName, isGlyph, LOGOS } from "./icons";

  type Tone = "inherit" | "muted";

  const STROKE_WIDTH = 1.5;
  const LOGO_VIEWBOX = "0 0 24 24";

  let { name, size = 16, tone = "inherit" }: { name: IconName; size?: number; tone?: Tone } =
    $props();
</script>

<span class={tone}>
  {#if isGlyph(name)}
    {@const Glyph = GLYPHS[name]}
    <Glyph {size} stroke={STROKE_WIDTH} aria-hidden="true" />
  {:else}
    {@const logo = LOGOS[name]}
    <svg width={size} height={size} viewBox={LOGO_VIEWBOX} aria-hidden="true">
      <path d={logo.path} fill="#{logo.hex}" />
    </svg>
  {/if}
</span>

<style>
  span {
    display: inline-flex;
    flex: none;
  }

  .muted {
    color: var(--ui-muted);
  }
</style>
