# List the available recipes
[private]
default:
    just --list

# Compile the ponte CLI binary
build:
    mkdir -p out
    bun build ./apps/ponte/src/index.ts --compile --outfile ./out/ponte

# Format the Bun/TS source and tests
format:
    biome format --write ./apps/ponte/src ./apps/ponte/tests

# Check style, conventions, types and architecture boundaries
lint:
    biome lint --error-on-warnings ./apps/ponte/src ./apps/ponte/tests
    @if grep -rnE '^ *(export )?(async )?function ' apps/ponte/src apps/ponte/tests --include='*.ts'; then echo "error arrow-functions-only: declare every function as const name = () => {}"; exit 1; fi
    cd apps/ponte && bun run scripts/check-conventions.ts src
    cd apps/ponte && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
    cd apps/ponte && ./node_modules/.bin/depcruise src --config .dependency-cruiser.jsonc --output-type err-long
    @if grep -rnE '\b(async|await|Promise)\b' apps/ponte/src/domain; then echo "error domain-is-synchronous: the domain layer must stay synchronous, so it cannot do IO"; exit 1; fi

# Run every test, the end-to-end suite included
test:
    bun test ./apps/ponte/tests
