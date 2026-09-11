#!/usr/bin/env bash
set -euo pipefail

mkdir -p out
bun build ./apps/ponte/src/index.ts --compile --outfile ./out/ponte
