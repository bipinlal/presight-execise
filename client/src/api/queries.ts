import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { DirectoryState } from '../types';
import { fetchFacets, fetchUsers } from './client';

export function useUsers(state: DirectoryState) {
  return useInfiniteQuery({
    queryKey: ['users', state],
    queryFn: ({ pageParam, signal }) => fetchUsers(state, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useFacets(state: DirectoryState) {
  const { search, nationalities, hobbies } = state;
  return useQuery({
    queryKey: ['facets', { search, nationalities, hobbies }],
    queryFn: ({ signal }) => fetchFacets({ search, nationalities, hobbies }, signal),
    placeholderData: keepPreviousData,
  });
}
