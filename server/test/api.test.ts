import request from 'supertest';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb, type DB } from '../src/db/db.js';
import { seed } from '../src/db/seed.js';
import { ageFromDateOfBirth, type User } from '../src/repository.js';

let db: DB;
let server: Server;
let all: User[];

beforeAll(() => {
  db = openDb(':memory:');
  seed(db, 1500, 7);
  server = createApp(db).listen(0);
  const hobbyRows = db
    .prepare('SELECT uh.user_id, h.name FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id')
    .all() as { user_id: number; name: string }[];
  all = (db.prepare('SELECT * FROM users').all() as Omit<User, 'age' | 'hobbies'>[]).map((u) => ({
    ...u,
    age: ageFromDateOfBirth(u.date_of_birth),
    hobbies: hobbyRows.filter((r) => r.user_id === u.id).map((r) => r.name),
  }));
});

afterAll(() => {
  server.close();
  db.close();
});

type Query = Record<string, string | number | string[]>;

async function fetchAll(query: Query): Promise<User[]> {
  const out: User[] = [];
  let cursor: string | undefined;
  for (;;) {
    const res = await request(server)
      .get('/api/users')
      .query({ ...query, limit: 97, ...(cursor ? { cursor } : {}) });
    expect(res.status).toBe(200);
    out.push(...res.body.items);
    if (!res.body.hasMore) {
      expect(res.body.nextCursor).toBeNull();
      expect(out.length).toBe(res.body.total);
      return out;
    }
    cursor = res.body.nextCursor;
  }
}

function compare(field: keyof User, dir: 'asc' | 'desc') {
  // Age order is the reverse of birth-date order (exact, unlike whole-year ages).
  const [key, sign] = field === 'age' ? (['date_of_birth', -1] as const) : ([field, 1] as const);
  const d = dir === 'asc' ? 1 : -1;
  return (a: User, b: User) => {
    const av = a[key] as string | number;
    const bv = b[key] as string | number;
    // Mirror SQLite's default BINARY collation for strings; ids break ties in the requested direction.
    if (av !== bv) return (av < bv ? -1 : 1) * sign * d;
    return (a.id - b.id) * d;
  };
}

describe('GET /api/users', () => {
  it('returns pagination metadata', async () => {
    const res = await request(server).get('/api/users').query({ limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.hasMore).toBe(true);
    expect(typeof res.body.nextCursor).toBe('string');
    expect(res.body.total).toBe(1500);
    expect(res.body.items[0]).toHaveProperty('hobbies');
    expect(res.body.items[0].date_of_birth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.items[0].age).toBe(ageFromDateOfBirth(res.body.items[0].date_of_birth));
  });

  it('returns ages in non-decreasing order when sorted by age', async () => {
    const got = await fetchAll({ sortBy: 'age', sortDir: 'asc' });
    for (let i = 1; i < got.length; i++) expect(got[i].age).toBeGreaterThanOrEqual(got[i - 1].age);
    expect(Math.min(...got.map((u) => u.age))).toBeGreaterThanOrEqual(18);
    expect(Math.max(...got.map((u) => u.age))).toBeLessThanOrEqual(80);
  });

  for (const sortBy of ['first_name', 'last_name', 'age', 'nationality'] as const) {
    for (const sortDir of ['asc', 'desc'] as const) {
      it(`pages through every user exactly once sorted by ${sortBy} ${sortDir}`, async () => {
        const got = await fetchAll({ sortBy, sortDir });
        const expected = [...all].sort(compare(sortBy, sortDir));
        expect(got.map((u) => u.id)).toEqual(expected.map((u) => u.id));
      });
    }
  }

  it('text search matches first or last name, case-insensitively', async () => {
    const term = all[0].last_name.slice(0, 3).toLowerCase();
    const got = await fetchAll({ search: term });
    const expected = all.filter(
      (u) => u.first_name.toLowerCase().includes(term) || u.last_name.toLowerCase().includes(term),
    );
    expect(new Set(got.map((u) => u.id))).toEqual(new Set(expected.map((u) => u.id)));
  });

  it('text search matches a full name', async () => {
    const u = all[5];
    const got = await fetchAll({ search: `${u.first_name} ${u.last_name}` });
    expect(got.map((g) => g.id)).toContain(u.id);
  });

  it('treats LIKE wildcards literally', async () => {
    const got = await fetchAll({ search: '%' });
    expect(got).toHaveLength(0);
  });

  it('nationalities match ANY selected', async () => {
    const nats = ['British', 'Japanese'];
    const got = await fetchAll({ nationality: nats });
    const expected = all.filter((u) => nats.includes(u.nationality));
    expect(got.length).toBe(expected.length);
    expect(got.every((u) => nats.includes(u.nationality))).toBe(true);
  });

  it('hobbies match ALL selected', async () => {
    const hobbies = ['Reading', 'Hiking'];
    const got = await fetchAll({ hobby: hobbies });
    const expected = all.filter((u) => hobbies.every((h) => u.hobbies.includes(h)));
    expect(got.length).toBe(expected.length);
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((u) => hobbies.every((h) => u.hobbies.includes(h)))).toBe(true);
  });

  it('combines text, nationality, and hobby filters', async () => {
    const q = { search: 'a', nationality: ['American', 'German'], hobby: ['Cooking'] };
    const got = await fetchAll({ ...q, sortBy: 'age', sortDir: 'desc' });
    const expected = all
      .filter(
        (u) =>
          (u.first_name.toLowerCase().includes('a') || u.last_name.toLowerCase().includes('a')) &&
          q.nationality.includes(u.nationality) &&
          u.hobbies.includes('Cooking'),
      )
      .sort(compare('age', 'desc'));
    expect(got.map((u) => u.id)).toEqual(expected.map((u) => u.id));
  });

  it('rejects invalid params', async () => {
    expect((await request(server).get('/api/users').query({ sortBy: 'id; DROP' })).status).toBe(
      400,
    );
    expect((await request(server).get('/api/users').query({ limit: 1000 })).status).toBe(400);
    expect((await request(server).get('/api/users').query({ cursor: 'garbage' })).status).toBe(400);
  });

  it('rejects a cursor used with a different sort', async () => {
    const first = await request(server).get('/api/users').query({ sortBy: 'age', limit: 5 });
    const { nextCursor: cursor } = first.body;

    const sameSort = await request(server)
      .get('/api/users')
      .query({ sortBy: 'age', limit: 5, cursor });
    expect(sameSort.status).toBe(200);

    for (const sort of [{ sortBy: 'first_name' }, { sortBy: 'age', sortDir: 'desc' }]) {
      const res = await request(server)
        .get('/api/users')
        .query({ ...sort, cursor });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Cursor does not match the requested sort');
    }
  });

  it('rejects a cursor without sort information', async () => {
    const cursor = Buffer.from(JSON.stringify({ v: 'Aaron', id: 1 })).toString('base64url');
    const res = await request(server).get('/api/users').query({ cursor });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid cursor');
  });
});

describe('GET /api/facets', () => {
  function expectedFacets(users: User[]) {
    const top = (values: string[]) => {
      const counts = new Map<string, number>();
      for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
      return [...counts]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : 1))
        .slice(0, 20);
    };
    return {
      hobbies: top(users.flatMap((u) => u.hobbies)),
      nationalities: top(users.map((u) => u.nationality)),
    };
  }

  it('returns global top 20 with no filters', async () => {
    const res = await request(server).get('/api/facets');
    expect(res.status).toBe(200);
    expect(res.body.hobbies).toHaveLength(20);
    expect(res.body.nationalities).toHaveLength(20);
    expect(res.body).toEqual(expectedFacets(all));
  });

  it('reflects the active text, nationality and hobby filters', async () => {
    const q = { search: 'e', nationality: ['British', 'French'], hobby: ['Reading'] };
    const res = await request(server).get('/api/facets').query(q);
    const matching = all.filter(
      (u) =>
        (u.first_name.toLowerCase().includes('e') || u.last_name.toLowerCase().includes('e')) &&
        q.nationality.includes(u.nationality) &&
        u.hobbies.includes('Reading'),
    );
    expect(res.body).toEqual(expectedFacets(matching));
    // Every matching user has the selected hobby, so it counts all of them.
    expect(res.body.hobbies[0]).toEqual({ value: 'Reading', count: matching.length });
  });
});

describe('ageFromDateOfBirth', () => {
  const today = new Date(Date.UTC(2026, 9, 28)); // 2026-10-28

  it('counts a birthday that has passed this year', () => {
    expect(ageFromDateOfBirth('1990-01-15', today)).toBe(36);
  });

  it('counts a birthday that falls today', () => {
    expect(ageFromDateOfBirth('1990-10-28', today)).toBe(36);
  });

  it('does not count a birthday later this year', () => {
    expect(ageFromDateOfBirth('1990-10-29', today)).toBe(35);
    expect(ageFromDateOfBirth('1990-12-01', today)).toBe(35);
  });
});
