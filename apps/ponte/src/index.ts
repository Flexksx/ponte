import { bootstrap } from "./bootstrap";
import { run, warn } from "./cli/run";

(async () => {
  const exitCode = await run(bootstrap({ warn }), Bun.argv.slice(2));
  process.exit(exitCode);
})();
