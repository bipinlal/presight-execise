import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA } from './schema.js';

export type DB = Database.Database;

export const DEFAULT_DB_PATH = path.resolve(
  process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'users.db'),
);

export function openDb(file: string = DEFAULT_DB_PATH): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  dropOutdatedSchema(db);
  db.exec(SCHEMA);
  return db;
}

// Earlier versions stored `age` instead of `date_of_birth`. The data is seeded, so
// rebuild the tables rather than migrating; the server re-seeds an empty database.
function dropOutdatedSchema(db: DB): void {
  const columns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  if (columns.length && !columns.some((c) => c.name === 'date_of_birth')) {
    db.exec(
      'DROP TABLE IF EXISTS user_hobbies; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS hobbies;',
    );
  }
}

export function userCount(db: DB): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
}
