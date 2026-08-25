/**
 * Biome after-tool extension for pi.
 *
 * Fires on `tool_result` after any tool call completes. When the agent
 * wrote or edited a file that Biome understands, this runs a read-only
 * `biome check` on that file and appends any diagnostics to the tool
 * result so the model sees and fixes them on the next model request.
 *
 * Mirrors the Claude Code PostToolUse hook (.claude/hooks/biome-after-edit.sh).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BIOME_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".json",
	".jsonc",
	".css",
	".graphql",
	".gql",
]);

export default function (pi: ExtensionAPI) {
	pi.on("tool_result", async (event, ctx) => {
		// Only act on file-writing tools.
		if (event.toolName !== "write" && event.toolName !== "edit") {
			return;
		}

		// Both write and edit carry the target in `path`.
		const input = event.input as Record<string, unknown> | undefined;
		const filePath = typeof input?.path === "string" ? input.path : "";
		if (!filePath) return;

		const ext = filePath.slice(filePath.lastIndexOf("."));
		if (!BIOME_EXTENSIONS.has(ext)) return;

		// Biome must be on PATH; degrade silently if absent.
		try {
			await pi.exec("biome", ["version"], { signal: ctx.signal, timeout: 5000 });
		} catch {
			return;
		}

		const result = await pi.exec(
			"biome",
			[
				"check",
				"--reporter=concise",
				"--diagnostic-level=error",
				"--colors=never",
				filePath,
			],
			{ signal: ctx.signal, timeout: 60000 },
		);

		const diag = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
		if (!diag) return;

		let note = diag;
		if (note.length > 8000) note = `${note.slice(0, 8000)}\n... (truncated)`;

		// Existing text blocks end with a line; add a blank line separator.
		const content = Array.isArray(event.content) ? [...event.content] : [];
		const sep = content.length > 0 ? "\n\n" : "";

		return {
			content: [
				...content,
				{
					type: "text",
					text: `${sep}biome reported errors in ${filePath}. Fix them before continuing. Reproduce locally with:\n\n    biome check "${filePath}"\n\n${note}`,
				},
			],
		};
	});
}