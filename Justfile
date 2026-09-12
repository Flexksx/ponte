# List the available recipes
[private]
default:
    just --list

# Compile the ponte CLI binary
build UNIT="all":
    moon run {{ if UNIT == "all" { ":build" } else { UNIT + ":build" } }}

# Format the Bun/TS source and tests
format:
    moon run repo:format

# Check style, conventions, types and architecture boundaries
lint:
    moon run repo:lint repo:arrow-functions-only :typecheck :conventions :architecture core:domain-sync

# Run every test, the end-to-end suite included
test UNIT="all":
    moon run {{ if UNIT == "all" { ":test" } else { UNIT + ":test" } }}

# Sync moon project graph after adding or removing units
sync:
    moon sync projects
