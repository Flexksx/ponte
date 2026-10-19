#!/usr/bin/env bash
set -euo pipefail

SOURCES=(
  apps/ponte/src
  apps/ponte/tests
  apps/web/src
  libs/api-client/src
  libs/ui/src
  libs/core/src
  libs/core/tests
)

biome check --write --error-on-warnings "${SOURCES[@]}"

alejandra --quiet nix flake.nix

rumdl check --fix README.md apps/ponte/src/cli/manual.md
