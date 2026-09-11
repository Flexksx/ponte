#!/usr/bin/env bash
set -uo pipefail

INPUT="$(cat)"
if [ -z "$INPUT" ]; then
  exit 0
fi

FILE_PATH="$(jq -r '.tool_input.file_path // ""' <<<"$INPUT")"
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
  exit 0
fi

case "$FILE_PATH" in
*/.github/workflows/*.yml | */.github/workflows/*.yaml) ;;
*) exit 0 ;;
esac

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

if grep -qE '\bnix\s+develop\b' "$FILE_PATH"; then
  MATCHES=$(grep -nE '\bnix\s+develop\b' "$FILE_PATH")
  MSG="BLOCKED: 'nix develop' is not allowed in GitHub Actions workflows. CI must use 'nix flake check' or 'nix build'. Remove it from:

$MATCHES"

  jq -cn --arg ctx "$MSG" \
    '{ "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": $ctx } }'
  exit 0
fi

exit 0
