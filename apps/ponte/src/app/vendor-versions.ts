import {
  parseVersion,
  type ReadVersionOutput,
  VERSION_COMMANDS,
  type VendorName,
  type VendorVersions,
} from "@ponte/core";

export type ReadVendorVersions = () => Promise<VendorVersions>;

type ReadVendorVersionsDeps = {
  readVersionOutput: ReadVersionOutput;
};

export const createReadVendorVersions = (
  deps: ReadVendorVersionsDeps,
): ReadVendorVersions => {
  const probe = async (): Promise<VendorVersions> => {
    const versions: Partial<Record<VendorName, string>> = {};
    const commands = Object.entries(VERSION_COMMANDS);
    const outputs = await Promise.all(
      commands.map(([, command]) => deps.readVersionOutput(command)),
    );
    for (const [index, [name]] of commands.entries()) {
      const output = outputs[index];
      const version = output == null ? null : parseVersion(output);
      if (version !== null) {
        versions[name as VendorName] = version;
      }
    }
    return versions;
  };

  let versions: Promise<VendorVersions> | null = null;
  return () => {
    versions ??= probe();
    return versions;
  };
};
