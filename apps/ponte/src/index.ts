import { run } from "./cli";

// Bun.argv[0] is the runtime and Bun.argv[1] the module path in both script
// and compiled modes, so the user arguments begin at index 2.
const exitCode = await run(Bun.argv.slice(2));
process.exit(exitCode);