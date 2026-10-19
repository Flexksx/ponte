# List the available recipes
[private]
default:
    just --list

# Compile the ponte CLI binary
build:
    ./scripts/build.sh

# Format the Bun/TS source and tests
format:
    ./scripts/format.sh

# Check style, conventions, types and architecture boundaries
lint:
    ./scripts/lint.sh

# Run every test, the end-to-end suite included
test:
    ./scripts/test.sh

# Run a unit from source and reload it on every change: `web` serves the page, REST and MCP on port 4775
dev unit:
    @test "{{unit}}" = web || { echo "unknown unit: {{unit}} (expected: web)" >&2; exit 1; }
    bun --hot apps/ponte/src/index.ts serve --port 4775
