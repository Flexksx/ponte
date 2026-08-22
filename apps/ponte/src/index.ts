import { run } from "./cli";

const exitCode = await run(Bun.argv.slice(2));
process.exit(exitCode);
