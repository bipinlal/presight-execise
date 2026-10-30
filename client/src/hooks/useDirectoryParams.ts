import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { SORT_FIELDS, type DirectoryState, type SortDir, type SortField } from '../types';

const DEFAULTS = { sortBy: 'first_name' as SortField, sortDir: 'asc' as SortDir };

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();

/** Directory view state, stored in (and restored from) the URL query string. */
export function useDirectoryParams() {
  const [params, setParams] = useSearchParams();

  const paramsKey = params.toString();
  const state = useMemo<DirectoryState>(() => {
    const s = readState(new URLSearchParams(paramsKey));
    return {
      ...s,
      search: s.search.trim(),
      nationalities: unique(s.nationalities),
      hobbies: unique(s.hobbies),
    };
  }, [paramsKey]);

  const update = useCallback(
    (patch: Partial<DirectoryState>, opts?: { replace?: boolean }) => {
      setParams(
        (prev) => {
          return writeState({ ...readState(prev), ...patch });
        },
        { replace: opts?.replace },
      );
    },
    [setParams],
  );

  const toggle = useCallback(
    (key: 'nationalities' | 'hobbies', value: string) => {
      const current = state[key];
      update({
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      });
    },
    [state, update],
  );

  const clearFilters = useCallback(
    () => update({ search: '', nationalities: [], hobbies: [] }),
    [update],
  );

  return { state, update, toggle, clearFilters };
}

function readState(p: URLSearchParams): DirectoryState {
  const sort = p.get('sort');
  return {
    search: p.get('q') ?? '',
    nationalities: p.getAll('nationality'),
    hobbies: p.getAll('hobby'),
    sortBy: SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : DEFAULTS.sortBy,
    sortDir: p.get('dir') === 'desc' ? 'desc' : DEFAULTS.sortDir,
  };
}

function writeState(s: DirectoryState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.search) p.set('q', s.search);
  unique(s.nationalities).forEach((n) => p.append('nationality', n));
  unique(s.hobbies).forEach((h) => p.append('hobby', h));
  if (s.sortBy !== DEFAULTS.sortBy) p.set('sort', s.sortBy);
  if (s.sortDir !== DEFAULTS.sortDir) p.set('dir', s.sortDir);
  return p;
}
