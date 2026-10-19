export type Route =
  | { readonly page: "workspaces" }
  | { readonly page: "workspace"; readonly name: string }
  | { readonly page: "setup" };

export const HOME_HREF = "#/";

export const SETUP_HREF = "#/setup";

const WORKSPACE_PATH = /^#\/workspaces\/([^/]+)$/;

export const workspaceHref = (name: string): string =>
  `#/workspaces/${encodeURIComponent(name)}`;

export const parseRoute = (hash: string): Route => {
  if (hash === SETUP_HREF) {
    return { page: "setup" };
  }
  const name = WORKSPACE_PATH.exec(hash)?.[1];
  return name === undefined
    ? { page: "workspaces" }
    : { page: "workspace", name: decodeURIComponent(name) };
};
