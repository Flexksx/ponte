#!/usr/bin/env bash
set -euo pipefail

msg_file="$1"

if grep -qiE '^Co-Authored-By:.*\b(claude|anthropic|openai|gpt|copilot|gemini|cursor|codeium|devin|codex)\b' "$msg_file"; then
  echo "error: commit message contains an AI co-author line" >&2
  echo "Remove the Co-Authored-By trailer before committing." >&2
  exit 1
fi
