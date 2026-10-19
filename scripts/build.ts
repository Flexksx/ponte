import { SveltePlugin } from "bun-plugin-svelte";

const outfile = Bun.argv[2];
if (outfile === undefined) throw new Error("usage: build.ts <outfile>");

const result = await Bun.build({
  entrypoints: ["./apps/ponte/src/index.ts"],
  compile: { outfile },
  minify: true,
  plugins: [SveltePlugin()],
});

if (!result.success) {
  for (const log of result.logs) process.stderr.write(`${log}\n`);
  process.exit(1);
}
