import type { Repository, WorkspaceOverview } from "@ponte/core";

export type Filters = {
  readonly tag: string | null;
  readonly organization: string | null;
  readonly repository: string | null;
};

export type FilterOption = { value: string; count: number };

export const NO_FILTERS: Filters = {
  tag: null,
  organization: null,
  repository: null,
};

export const repositoryLabel = (repository: Repository): string =>
  `${repository.owner}/${repository.name}`;

const organizationsOf = (entry: WorkspaceOverview): string[] => [
  ...new Set(entry.repositories.map(repository => repository.owner)),
];

const repositoriesOf = (entry: WorkspaceOverview): string[] =>
  entry.repositories.map(repositoryLabel);

const tagsOf = (entry: WorkspaceOverview): readonly string[] =>
  entry.workspace.tags;

const optionsFrom = (
  entries: readonly WorkspaceOverview[],
  valuesOf: (entry: WorkspaceOverview) => readonly string[],
): FilterOption[] => {
  const counts = new Map<string, number>();
  for (const value of entries.flatMap(valuesOf)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort(
      (first, second) =>
        second.count - first.count || first.value.localeCompare(second.value),
    );
};

export const tagOptions = (
  entries: readonly WorkspaceOverview[],
): FilterOption[] => optionsFrom(entries, tagsOf);

export const organizationOptions = (
  entries: readonly WorkspaceOverview[],
): FilterOption[] => optionsFrom(entries, organizationsOf);

export const repositoryOptions = (
  entries: readonly WorkspaceOverview[],
): FilterOption[] => optionsFrom(entries, repositoriesOf);

export const matchesFilters = (
  entry: WorkspaceOverview,
  filters: Filters,
): boolean =>
  (filters.tag === null || tagsOf(entry).includes(filters.tag)) &&
  (filters.organization === null ||
    organizationsOf(entry).includes(filters.organization)) &&
  (filters.repository === null ||
    repositoriesOf(entry).includes(filters.repository));
