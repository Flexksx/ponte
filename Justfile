# Compile the ponte CLI binary
mod build '.just/build'

# Format the Bun/TS source and tests
mod format '.just/format'

# Check style, conventions, types and architecture boundaries
mod lint '.just/lint'

# Run the unit and end-to-end suites
mod test '.just/test'

[private]
default:
    just --list --list-submodules
