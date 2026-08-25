import { run } from "./cli/run";

const exitCode = await run(Bun.argv.slice(2));
process.exit(exitCode);
