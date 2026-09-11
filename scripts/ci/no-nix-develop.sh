#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
WORKFLOWS_DIR="$ROOT/.github/workflows"

if [ ! -d "$WORKFLOWS_DIR" ]; then
  exit 0
fi

violations=()

for file in "$WORKFLOWS_DIR"/*.yml "$WORKFLOWS_DIR"/*.yaml; do
  [ -f "$file" ] || continue
  if grep -nE '\bnix\s+develop\b' "$file" >/dev/null 2>&1; then
    matches=$(grep -nE '\bnix\s+develop\b' "$file")
    while IFS= read -r line; do
      violations+=("${file#"$ROOT/"}:$line")
    done <<< "$matches"
  fi
done

if [ ${#violations[@]} -eq 0 ]; then
  exit 0
fi

echo "ERROR: 'nix develop' found in GitHub Actions workflows."
echo "CI must use 'nix flake check' or 'nix build', not 'nix develop'."
echo ""
for v in "${violations[@]}"; do
  echo "  $v"
done
exit 1
