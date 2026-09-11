#!/usr/bin/env bash
set -euo pipefail

SOURCES=(
  apps/ponte/src
  apps/ponte/tests
  libs/core/src
  libs/core/tests
)

biome format --write "${SOURCES[@]}"
