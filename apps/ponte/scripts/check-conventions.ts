import { readdir } from "node:fs/promises";
import { join } from "node:path";

type Group = 1 | 2 | 3 | 4;

type Violation = {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly message: string;
};

const BINDING = /^(export )?(const|let|var) [A-Za-z_$][\w$]* ?(<[^=]*>)?(:[^=]*)? = /;

const GROUP_NAMES: Record<Group, string> = {
  1: "constants",
  2: "types, interfaces and classes",
  3: "functions",
  4: "statements",
};

const FUNCTION_DECLARATION = /^ *(export )?(default )?(async )?function[ *]/;
const TYPE_DECLARATION = /^(export )?(declare )?(abstract class|type|interface|class|enum) /;
const NAMED_CONSTANT = /^(export )?const [A-Z][A-Z0-9_]* ?(:[^=]*)? = /;
const ARROW_FUNCTION = /^(export )?const [A-Za-z_$][\w$]* ?(<[^=]*>)?(:[^=]*)? = (async )?[(<]/;

const classify = (line: string): Group | null => {
  if (TYPE_DECLARATION.test(line)) return 2;
  if (NAMED_CONSTANT.test(line)) return 1;
  if (ARROW_FUNCTION.test(line)) return 3;
  if (BINDING.test(line)) return 4;
  return null;
};

const checkFile = async (file: string): Promise<Violation[]> => {
  const violations: Violation[] = [];
  const lines = (await Bun.file(file).text()).split("\n");
  let highest: Group = 1;
  for (const [index, line] of lines.entries()) {
    if (FUNCTION_DECLARATION.test(line)) {
      violations.push({
        file,
        line: index + 1,
        text: line.trim(),
        message: "declare every function as `const name = () => {}`",
      });
      continue;
    }
    const group = classify(line);
    if (group === null) continue;
    if (group < highest) {
      violations.push({
        file,
        line: index + 1,
        text: line.trim(),
        message: `${GROUP_NAMES[group]} must come before ${GROUP_NAMES[highest]}`,
      });
      continue;
    }
    highest = group;
  }
  return violations;
};

const sourceFiles = async (root: string): Promise<string[]> =>
  (await readdir(root, { recursive: true }))
    .filter(name => name.endsWith(".ts"))
    .map(name => join(root, name))
    .sort();

const root = Bun.argv[2];
if (root === undefined) throw new Error("usage: check-conventions.ts <source-directory>");

const violations = (await Promise.all((await sourceFiles(root)).map(checkFile))).flat();
for (const violation of violations) {
  process.stderr.write(`${violation.file}:${violation.line} ${violation.message}\n`);
  process.stderr.write(`  ${violation.text}\n`);
}
if (violations.length > 0) {
  process.stderr.write(`\nerror declaration-order: ${violations.length} violation(s)\n`);
  process.exit(1);
}
