const VERSION = /\d+(?:\.\d+)+/;

export const parseVersion = (output: string): string | null =>
  VERSION.exec(output)?.[0] ?? null;

export const isVersionAtLeast = (version: string, minimum: string): boolean => {
  const left = version.split(".").map(Number);
  const right = minimum.split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a !== b) {
      return a > b;
    }
  }
  return true;
};
