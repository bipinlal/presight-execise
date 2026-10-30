import { z } from 'zod';

export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

// Accept `?hobby=a&hobby=b` (array) as well as a single value.
const stringList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => [
    ...new Set(
      (v === undefined ? [] : Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean),
    ),
  ]);

export const filterSchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  nationality: stringList,
  hobby: stringList,
});

export const usersQuerySchema = filterSchema.extend({
  sortBy: z.enum(SORT_FIELDS).optional().default('first_name'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

export type Filters = z.infer<typeof filterSchema>;
export type UsersQuery = z.infer<typeof usersQuerySchema>;

type Params = (string | number)[];

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** WHERE clause over `users u` shared by the list and facet queries. */
export function buildWhere(filters: Filters): { sql: string; params: Params } {
  const clauses: string[] = [];
  const params: Params = [];

  if (filters.search) {
    const like = `%${escapeLike(filters.search)}%`;
    clauses.push(
      `(u.first_name LIKE ? ESCAPE '\\' OR u.last_name LIKE ? ESCAPE '\\'
        OR (u.first_name || ' ' || u.last_name) LIKE ? ESCAPE '\\')`,
    );
    params.push(like, like, like);
  }

  // Nationalities: match ANY selected.
  if (filters.nationality.length) {
    clauses.push(`u.nationality IN (${filters.nationality.map(() => '?').join(', ')})`);
    params.push(...filters.nationality);
  }

  // Hobbies: match ALL selected.
  if (filters.hobby.length) {
    clauses.push(
      `u.id IN (
        SELECT uh.user_id FROM user_hobbies uh
        JOIN hobbies h ON h.id = uh.hobby_id
        WHERE h.name IN (${filters.hobby.map(() => '?').join(', ')})
        GROUP BY uh.user_id
        HAVING COUNT(*) = ?
      )`,
    );
    params.push(...filters.hobby, filters.hobby.length);
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}
