#!/usr/bin/env bash
# Biome after-edit hook for Claude Code.
#
# Claude Code passes PostToolUse JSON on stdin. When the agent edits or
# writes a file that Biome understands, we run `biome check` (read-only)
# on it. If anything is wrong, we return the diagnostics as
# `hookSpecificOutput.additionalContext` so Claude sees them and fixes them.
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

# Biome must be on PATH. If not, degrade silently rather than error the hook.
if ! command -v biome >/dev/null 2>&1; then
	exit 0
fi

# Biome reads biome.jsonc from the current working directory.
# biome check is read-only: it reports formatting/lint/assist issues.
# `--diagnostic-level=error` forwards only real errors.
# `--reporter=concise` keeps each diagnostic on one readable line.
DIAG="$(biome check --reporter=concise --diagnostic-level=error --colors=never "$FILE_PATH" 2>&1 || true)"

# No output means nothing needs fixing.
if [ -z "$(echo "$DIAG" | tr -d '[:space:]')" ]; then
	exit 0
fi

# Diagnostics may exceed the 10k additionalContext cap; trim to be safe.
if [ "${#DIAG}" -gt 8000 ]; then
	DIAG="${DIAG:0:8000}\n... (truncated; fix the visible issues first)"
fi

NOTE="biome reported errors in $FILE_PATH. Fix them before continuing. Reproduce locally with: biome check \"$FILE_PATH\"

$DIAG"

# Return the diagnostics to Claude as Context_tool_result, using the documented
# PostToolUse additionalContext shape.
jq -cn --arg ctx "$NOTE" \
	'{ "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": $ctx } }'
