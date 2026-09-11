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
