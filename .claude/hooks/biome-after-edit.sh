#!/usr/bin/env bash
# Biome after-edit hook for Claude Code.
#
# Claude Code passes PostToolUse JSON on stdin. When the agent edits or
# writes a file that Biome understands, we apply `biome check --write` to
# it, then re-check it the same way `just lint` does. Whatever Biome cannot
# fix on its own comes back as `hookSpecificOutput.additionalContext`, so
# Claude sees the remaining problems and fixes them.
#
# It exits quietly (empty stdout) when there is nothing to report, so a
# clean edit never interrupts the agent.

set -uo pipefail

# Full hook JSON payload from stdin.
INPUT="$(cat)"
if [ -z "$INPUT" ]; then
	exit 0
fi

FILE_PATH="$(jq -r '.tool_input.file_path // ""' <<<"$INPUT")"
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
	exit 0
fi

# Only biome-supported file types.
case "$FILE_PATH" in
*.ts | *.tsx | *.mts | *.cts | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css | *.graphql | *.gql) ;;
*) exit 0 ;;
esac

# A deleted or moved file has nothing to check.
if [ ! -f "$FILE_PATH" ]; then
	exit 0
fi

report() {
	jq -cn --arg ctx "$1" \
		'{ "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": $ctx } }'
	exit 0
}

# Biome reads biome.jsonc from the current working directory.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Tell Claude when the hook cannot run, instead of failing silently.
if ! command -v biome >/dev/null 2>&1; then
	report "biome is not on PATH, so $FILE_PATH was not formatted or checked. Enter the dev shell (direnv allow) before editing, or run: just lint"
fi

# Apply what Biome can fix by itself: formatting, safe lint fixes, assists.
biome check --write --colors=off "$FILE_PATH" >/dev/null 2>&1

# Then re-check. `--error-on-warnings` matches `just lint`, so the hook and
# the lint task agree on what counts as a failure. The exit code is the
# signal: Biome always prints a summary line, so empty output means nothing.
DIAG="$(biome check --error-on-warnings --max-diagnostics=20 --colors=off "$FILE_PATH" 2>&1)"
STATUS=$?
if [ "$STATUS" -eq 0 ]; then
	exit 0
fi

# biome.jsonc limits Biome to apps/*/src and apps/*/tests. A path outside
# that is reported as ignored, which is not a problem worth surfacing.
case "$DIAG" in
*"provided but ignored"* | *"No files were processed"*) exit 0 ;;
esac

# Diagnostics may exceed the 10k additionalContext cap; trim to be safe.
if [ "${#DIAG}" -gt 8000 ]; then
	DIAG="${DIAG:0:8000}
... (truncated; fix the visible problems first)"
fi

report "biome formatted $FILE_PATH, but these problems remain. Fix them before continuing. Reproduce with: biome check --error-on-warnings \"$FILE_PATH\"

$DIAG"
