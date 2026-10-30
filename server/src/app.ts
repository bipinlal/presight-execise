import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { ZodError } from 'zod';
import { InvalidCursorError } from './cursor.js';
import type { DB } from './db/db.js';
import { filterSchema, usersQuerySchema } from './filters.js';
import { getFacets, listUsers } from './repository.js';

export function createApp(db: DB, opts: { staticDir?: string } = {}) {
  const app = express();
  app.set('query parser', 'extended');

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/users', (req, res) => {
    res.json(listUsers(db, usersQuerySchema.parse(req.query)));
  });

  app.get('/api/facets', (req, res) => {
    res.json(getFacets(db, filterSchema.parse(req.query)));
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { message: 'Not found' } });
  });

  // Serve the built client (Docker / production) with SPA fallback.
  if (opts.staticDir && fs.existsSync(opts.staticDir)) {
    const staticDir = opts.staticDir;
    app.use(express.static(staticDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          message: err.issues.map((i) => `${i.path.join('.') || 'query'}: ${i.message}`).join('; '),
        },
      });
      return;
    }
    if (err instanceof InvalidCursorError) {
      res.status(400).json({ error: { message: err.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { message: 'Internal server error' } });
  };
  app.use(errorHandler);

  return app;
}
