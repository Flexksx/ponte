#!/usr/bin/env bash
# dependency-cruiser after-edit hook for Claude Code.
#
# Claude Code passes PostToolUse JSON on stdin. When the agent edits a
# TypeScript file under apps/ponte/src, we cruise the whole source graph the
# same way `just lint` does. Architecture rules are about edges between
# modules, so a single file cannot be checked on its own: one new import can
# break a boundary in a file the agent never touched.
#
# Violations come back as `hookSpecificOutput.additionalContext`, so Claude
# sees them and fixes them. It exits quietly (empty stdout) when the graph is
# clean, so a good edit never interrupts the agent.

set -uo pipefail

APP_DIR="apps/ponte"
DEPCRUISE="./node_modules/.bin/depcruise"
CONFIG=".dependency-cruiser.jsonc"

# Full hook JSON payload from stdin.
INPUT="$(cat)"
if [ -z "$INPUT" ]; then
	exit 0
fi

FILE_PATH="$(jq -r '.tool_input.file_path // ""' <<<"$INPUT")"
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
	exit 0
fi

# Only TypeScript sources. Tests and scripts are outside the cruised graph.
case "$FILE_PATH" in
*.ts | *.tsx | *.mts | *.cts) ;;
*) exit 0 ;;
esac
case "$FILE_PATH" in
*"/$APP_DIR/src/"*) ;;
*) exit 0 ;;
esac

report() {
	jq -cn --arg ctx "$1" \
		'{ "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": $ctx } }'
	exit 0
}

cd "${CLAUDE_PROJECT_DIR:-.}/$APP_DIR" || exit 0

# Tell Claude when the hook cannot run, instead of failing silently.
if [ ! -x "$DEPCRUISE" ]; then
	report "dependency-cruiser is not installed, so the architecture rules were not checked. Run: cd $APP_DIR && bun install"
fi

# `err-long` matches `just lint`, so the hook and the lint task agree on what
# counts as a failure. The exit code is the signal: depcruise always prints a
# summary line, so empty output means nothing.
DIAG="$("$DEPCRUISE" src --config "$CONFIG" --output-type err-long 2>&1)"
STATUS=$?
if [ "$STATUS" -eq 0 ]; then
	exit 0
fi

# Diagnostics may exceed the 10k additionalContext cap; trim to be safe.
if [ "${#DIAG}" -gt 8000 ]; then
	DIAG="${DIAG:0:8000}
... (truncated; fix the visible violations first)"
fi

report "Editing $FILE_PATH left the module graph in violation of the architecture rules. The listed modules can differ from the file you edited, because a rule covers an edge between two modules. Fix them before continuing. Reproduce with: cd $APP_DIR && $DEPCRUISE src --config $CONFIG --output-type err-long

$DIAG"
