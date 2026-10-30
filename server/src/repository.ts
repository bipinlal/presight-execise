import type { DB } from './db/db.js';
import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor.js';
import { buildWhere, type Filters, type SortField, type UsersQuery } from './filters.js';

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

type UserRow = Omit<User, 'age' | 'hobbies'>;

/** Whole years between an ISO `YYYY-MM-DD` birth date and `today` (UTC). */
export function ageFromDateOfBirth(dob: string, today = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  const age = today.getUTCFullYear() - y;
  const hadBirthday =
    today.getUTCMonth() + 1 > m || (today.getUTCMonth() + 1 === m && today.getUTCDate() >= d);
  return hadBirthday ? age : age - 1;
}

// Age is derived from date_of_birth, so sorting by age sorts birth dates the other way.
const SORT_COLUMNS: Record<SortField, { column: Exclude<keyof UserRow, 'id'>; inverted: boolean }> =
  {
    first_name: { column: 'first_name', inverted: false },
    last_name: { column: 'last_name', inverted: false },
    age: { column: 'date_of_birth', inverted: true },
    nationality: { column: 'nationality', inverted: false },
  };

export interface FacetValue {
  value: string;
  count: number;
}

export interface UsersPage {
  items: User[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

const FACET_LIMIT = 20;

export function listUsers(db: DB, q: UsersQuery): UsersPage {
  const where = buildWhere(q);
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM users u ${where.sql}`).get(...where.params) as {
      n: number;
    }
  ).n;

  // Keyset pagination over (sort column, id); columns come from a fixed map, never user input.
  // The id tie-breaker follows the requested direction, the column may be inverted (age).
  const { column, inverted } = SORT_COLUMNS[q.sortBy];
  const field = `u.${column}`;
  const desc = q.sortDir === 'desc';
  const fieldDesc = desc !== inverted;
  const dir = (isDesc: boolean) => (isDesc ? 'DESC' : 'ASC');
  const cmp = (isDesc: boolean) => (isDesc ? '<' : '>');

  let sql = where.sql;
  const params = [...where.params];
  if (q.cursor) {
    const c = decodeCursor(q.cursor);
    if (c.sortBy !== q.sortBy || c.sortDir !== q.sortDir) {
      throw new InvalidCursorError('Cursor does not match the requested sort');
    }
    sql += `${sql ? ' AND' : 'WHERE'} (${field} ${cmp(fieldDesc)} ? OR (${field} = ? AND u.id ${cmp(desc)} ?))`;
    params.push(c.v, c.v, c.id);
  }

  const rows = db
    .prepare(
      `SELECT u.id, u.avatar, u.first_name, u.last_name, u.date_of_birth, u.nationality
       FROM users u ${sql}
       ORDER BY ${field} ${dir(fieldDesc)}, u.id ${dir(desc)}
       LIMIT ?`,
    )
    .all(...params, q.limit + 1) as UserRow[];

  const hasMore = rows.length > q.limit;
  const pageRows = hasMore ? rows.slice(0, q.limit) : rows;
  const items = attachHobbies(db, pageRows);
  const last = pageRows.at(-1);

  return {
    items,
    hasMore,
    nextCursor:
      hasMore && last
        ? encodeCursor({ v: last[column], id: last.id, sortBy: q.sortBy, sortDir: q.sortDir })
        : null,
    total,
  };
}

function attachHobbies(db: DB, rows: UserRow[]): User[] {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const hobbyRows = db
    .prepare(
      `SELECT uh.user_id, h.name FROM user_hobbies uh
       JOIN hobbies h ON h.id = uh.hobby_id
       WHERE uh.user_id IN (${ids.map(() => '?').join(', ')})
       ORDER BY h.name`,
    )
    .all(...ids) as { user_id: number; name: string }[];

  const byUser = new Map<number, string[]>();
  for (const { user_id, name } of hobbyRows) {
    const list = byUser.get(user_id);
    if (list) list.push(name);
    else byUser.set(user_id, [name]);
  }
  const today = new Date();
  return rows.map((r) => ({
    ...r,
    age: ageFromDateOfBirth(r.date_of_birth, today),
    hobbies: byUser.get(r.id) ?? [],
  }));
}

/** Top hobbies and nationalities among users matching the full filter state. */
export function getFacets(db: DB, filters: Filters) {
  const where = buildWhere(filters);
  const hobbies = db
    .prepare(
      `SELECT h.name AS value, COUNT(*) AS count
       FROM users u
       JOIN user_hobbies uh ON uh.user_id = u.id
       JOIN hobbies h ON h.id = uh.hobby_id
       ${where.sql}
       GROUP BY h.name
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(...where.params) as FacetValue[];

  const nationalities = db
    .prepare(
      `SELECT u.nationality AS value, COUNT(*) AS count
       FROM users u
       ${where.sql}
       GROUP BY u.nationality
       ORDER BY count DESC, value ASC
       LIMIT ${FACET_LIMIT}`,
    )
    .all(...where.params) as FacetValue[];

  return { hobbies, nationalities };
}
