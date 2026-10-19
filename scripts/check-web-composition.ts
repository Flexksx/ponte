import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "svelte/compiler";

type AstNode = { readonly [key: string]: unknown };

type Violation = { readonly file: string; readonly line: number; readonly message: string };

const STYLING_ATTRIBUTES = new Set(["class", "style"]);

const HTML_STYLESHEET = /<style|rel=["']stylesheet["']/;

const RULE =
  "apps/web composes @ponte/ui components and lays them out with its layout components. Styling belongs in libs/ui.";

const lineAt = (source: string, offset: number): number =>
  source.slice(0, offset).split("\n").length;

const DIRECTIVE_PREFIXES: Record<string, string> = {
  ClassDirective: "class:",
  StyleDirective: "style:",
};

const describeStyling = (attribute: AstNode): string => {
  const prefix = DIRECTIVE_PREFIXES[String(attribute.type)];
  return prefix === undefined
    ? `${String(attribute.name)} attribute`
    : `${prefix}${String(attribute.name)} directive`;
};

const isStyling = (attribute: AstNode): boolean =>
  String(attribute.type) in DIRECTIVE_PREFIXES ||
  (attribute.type === "Attribute" && STYLING_ATTRIBUTES.has(String(attribute.name)));

const collectStyling = (value: unknown, found: AstNode[]): void => {
  if (Array.isArray(value)) {
    for (const item of value) collectStyling(item, found);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const node = value as AstNode;
  if (Array.isArray(node.attributes)) {
    found.push(...(node.attributes as AstNode[]).filter(isStyling));
  }
  for (const child of Object.values(node)) collectStyling(child, found);
};

const checkComponent = async (file: string): Promise<Violation[]> => {
  const source = await Bun.file(file).text();
  const root = parse(source, { modern: true });
  const violations: Violation[] = [];
  if (root.css !== null) {
    violations.push({ file, line: lineAt(source, root.css.start), message: "<style> block" });
  }
  const styling: AstNode[] = [];
  collectStyling(root.fragment, styling);
  for (const attribute of styling) {
    violations.push({
      file,
      line: lineAt(source, Number(attribute.start)),
      message: describeStyling(attribute),
    });
  }
  return violations;
};

const checkFile = async (file: string): Promise<Violation[]> => {
  if (file.endsWith(".svelte")) return checkComponent(file);
  if (file.endsWith(".css")) return [{ file, line: 1, message: "stylesheet" }];
  if (file.endsWith(".html") && HTML_STYLESHEET.test(await Bun.file(file).text())) {
    return [{ file, line: 1, message: "stylesheet in HTML" }];
  }
  return [];
};

const root = Bun.argv[2];
if (root === undefined) throw new Error("usage: check-web-composition.ts <source-directory>");

const files = (await readdir(root, { recursive: true })).map(name => join(root, name)).sort();
const violations = (await Promise.all(files.map(checkFile))).flat();
for (const violation of violations) {
  process.stderr.write(`${violation.file}:${violation.line} ${violation.message}\n`);
}
if (violations.length > 0) {
  process.stderr.write(`\nerror web-composes-ui: ${violations.length} violation(s). ${RULE}\n`);
  process.exit(1);
}
