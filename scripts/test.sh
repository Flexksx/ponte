#!/usr/bin/env bash
set -euo pipefail

bun test ./libs/core/tests ./apps/ponte/tests
