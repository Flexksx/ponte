#!/usr/bin/env bash
set -euo pipefail

UNIT=(./libs/core/tests ./apps/ponte/tests/*.test.ts)
E2E=(./apps/ponte/tests/e2e)

case "${1:-all}" in
unit) bun test "${UNIT[@]}" ;;
e2e) bun test "${E2E[@]}" ;;
all) bun test "${UNIT[@]}" "${E2E[@]}" ;;
*)
  echo "usage: test.sh [unit|e2e|all]" >&2
  exit 1
  ;;
esac
