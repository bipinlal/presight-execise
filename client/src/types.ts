export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDir = 'asc' | 'desc';

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface UsersPage {
  items: User[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}

export interface DirectoryFilters {
  search: string;
  nationalities: string[];
  hobbies: string[];
}

export interface DirectoryState extends DirectoryFilters {
  sortBy: SortField;
  sortDir: SortDir;
}
