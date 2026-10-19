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

biome lint --fix --unsafe --error-on-warnings "${SOURCES[@]}"

if grep -rnE '^ *(export )?(async )?function ' "${SOURCES[@]}" --include='*.ts' --exclude='*.d.ts'; then
  echo "error arrow-functions-only: declare every function as const name = () => {}" >&2
  exit 1
fi

bun run scripts/check-conventions.ts apps/ponte/src
bun run scripts/check-conventions.ts libs/core/src
bun run scripts/check-conventions.ts libs/api-client/src
bun run scripts/check-conventions.ts apps/web/src
bun run scripts/check-conventions.ts libs/ui/src

(cd apps/ponte && ./node_modules/.bin/tsc --noEmit -p tsconfig.json)
(cd apps/ponte && ./node_modules/.bin/tsc --noEmit -p ../../libs/core/tsconfig.json)
(cd apps/ponte && ./node_modules/.bin/tsc --noEmit -p ../../libs/core/tsconfig.test.json)

(cd apps/web && ./node_modules/.bin/svelte-check --tsconfig tsconfig.json --fail-on-warnings --output human)
(cd libs/ui && ./node_modules/.bin/svelte-check --tsconfig tsconfig.json --fail-on-warnings --output human)

(cd apps/ponte && ./node_modules/.bin/depcruise src tests --config .dependency-cruiser.jsonc --output-type err-long)
(cd apps/ponte && ./node_modules/.bin/depcruise ../../libs/core/src ../../libs/core/tests --config ../../libs/core/.dependency-cruiser.jsonc --output-type err-long)

if grep -rnE '\b(async|await|Promise)\b' libs/core/src/domain --include='*.ts' --exclude='*ports.ts'; then
  echo "error domain-is-synchronous: the domain logic must stay synchronous, so it cannot do IO. Only port files name a Promise" >&2
  exit 1
fi
