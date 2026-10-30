import path from 'node:path';
import { createApp } from './app.js';
import { openDb } from './db/db.js';
import { seedIfEmpty } from './db/seed.js';

const port = Number(process.env.PORT ?? 4000);
const db = openDb();
seedIfEmpty(db);

const staticDir = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : undefined;
createApp(db, { staticDir }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
