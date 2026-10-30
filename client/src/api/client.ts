import type { DirectoryFilters, DirectoryState, Facets, UsersPage } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function filterParams(f: DirectoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.search) params.set('search', f.search);
  f.nationalities.forEach((n) => params.append('nationality', n));
  f.hobbies.forEach((h) => params.append('hobby', h));
  return params;
}

async function getJson<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${path}?${params}`, { signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('Unable to reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export function fetchUsers(
  state: DirectoryState,
  cursor: string | null,
  signal?: AbortSignal,
  limit = 50,
): Promise<UsersPage> {
  const params = filterParams(state);
  params.set('sortBy', state.sortBy);
  params.set('sortDir', state.sortDir);
  params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);
  return getJson('/api/users', params, signal);
}

export function fetchFacets(filters: DirectoryFilters, signal?: AbortSignal): Promise<Facets> {
  return getJson('/api/facets', filterParams(filters), signal);
}
