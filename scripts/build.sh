#!/usr/bin/env bash
set -euo pipefail

mkdir -p out
bun scripts/build.ts ./out/ponte
