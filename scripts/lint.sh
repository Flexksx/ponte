#!/usr/bin/env bash
set -euo pipefail

SOURCES=(
  apps/ponte/src
  apps/ponte/tests
  libs/core/src
  libs/core/tests
)

biome lint --error-on-warnings "${SOURCES[@]}"

if grep -rnE '^ *(export )?(async )?function ' "${SOURCES[@]}" --include='*.ts' --exclude='*.d.ts'; then
  echo "error arrow-functions-only: declare every function as const name = () => {}" >&2
  exit 1
fi

bun run scripts/check-conventions.ts apps/ponte/src
bun run scripts/check-conventions.ts libs/core/src

(cd apps/ponte && ./node_modules/.bin/tsc --noEmit -p tsconfig.json)
(cd apps/ponte && ./node_modules/.bin/tsc --noEmit -p ../../libs/core/tsconfig.json)
(cd apps/ponte && ./node_modules/.bin/tsc --noEmit -p ../../libs/core/tsconfig.test.json)

(cd apps/ponte && ./node_modules/.bin/depcruise src --config .dependency-cruiser.jsonc --output-type err-long)
(cd apps/ponte && ./node_modules/.bin/depcruise ../../libs/core/src --config ../../libs/core/.dependency-cruiser.jsonc --output-type err-long)

if grep -rnE '\b(async|await|Promise)\b' libs/core/src/domain --include='*.ts'; then
  echo "error domain-is-synchronous: the domain layer must stay synchronous, so it cannot do IO" >&2
  exit 1
fi
