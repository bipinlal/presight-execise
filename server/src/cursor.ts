export interface Cursor {
  v: string;
  id: number;
  /** Sort the cursor was issued for; a cursor is only valid with that same sort. */
  sortBy: string;
  sortDir: string;
}

export class InvalidCursorError extends Error {}

export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');

export function decodeCursor(raw: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      c &&
      typeof c.id === 'number' &&
      typeof c.v === 'string' &&
      typeof c.sortBy === 'string' &&
      typeof c.sortDir === 'string'
    ) {
      return c;
    }
  } catch {
    // fall through
  }
  throw new InvalidCursorError('Invalid cursor');
}
