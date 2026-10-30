# Presight Frontend Exercise

A user directory with search, filters, sorting and infinite scrolling.

- **client/** – React 19, Vite, Tailwind 4, TanStack Query (`useInfiniteQuery`), TanStack Virtual, React Router (URL state)
- **server/** – Node 22, Express 5, `better-sqlite3`, `zod` request validation
- **Database** – SQLite file seeded with 10,000 users and 40 hobbies (0–10 per user)

The exercise brief is [below](#exercise-brief).

## Running locally

Prerequisites: Node.js 22 and Yarn 1 (`corepack enable` provides it).

```bash
yarn install   # installs both workspaces
yarn seed      # optional: (re)creates server/data/users.db with 10,000 users
yarn dev       # API on http://localhost:4000, client on http://localhost:5173
```

Open http://localhost:5173. Vite forwards `/api` requests to the API.

- If the database is empty, the server seeds it on startup, so `yarn seed` is only needed to reset the data.
- Set `SEED_COUNT=50000 yarn seed` for a different number of users. Set `DATABASE_PATH` to use a different database file.

| Command | What it does |
| --- | --- |
| `yarn dev` | Runs the API (`tsx watch`) and the Vite dev server together |
| `yarn seed` | Drops and re-seeds the SQLite database (deterministic seed) |
| `yarn test` | Runs the server test suite (Vitest + Supertest) |
| `yarn build` | Type-checks and builds the client (`client/dist`) and server (`server/dist`) |
| `yarn start` | Runs the built server. With `STATIC_DIR=../client/dist`, it also serves the client (the path is relative to `server/`) |

## Running with Docker Compose

```bash
docker compose up --build
```

Open http://localhost:4000. The single container serves both the API and the built client.

- The database is stored in the `db-data` volume and is seeded automatically the first time the container starts.
- Re-seed: `docker compose exec app node server/dist/db/seed.js`
- Start over with a fresh volume: `docker compose down -v`

## API

All list parameters can be repeated (`?hobby=Chess&hobby=Yoga`).

### `GET /api/users`

| Param | Default | Notes |
| --- | --- | --- |
| `search` | – | Case-insensitive substring match on `first_name`, `last_name` or the full name |
| `nationality` | – | Repeatable. Matches **any** selected nationality |
| `hobby` | – | Repeatable. User must have **all** selected hobbies |
| `sortBy` | `first_name` | `first_name`, `last_name`, `age`, `nationality` |
| `sortDir` | `asc` | `asc`, `desc` |
| `limit` | `50` | 1–100 |
| `cursor` | – | `nextCursor` from the previous page. Must be used with the same `sortBy` and `sortDir`, otherwise the API returns 400 |

```json
{
  "items": [
    {
      "id": 1,
      "avatar": "https://…",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "date_of_birth": "1990-12-10",
      "age": 35,
      "nationality": "British",
      "hobbies": ["Chess", "Reading"]
    }
  ],
  "nextCursor": "eyJ2IjoiQWRhIiwiaWQiOjF9",
  "hasMore": true,
  "total": 1234
}
```

### `GET /api/facets`

Accepts the same `search`, `nationality` and `hobby` parameters. Returns the top 20 values among users that match **all** active filters, ordered by count descending and then by value:

```json
{
  "hobbies": [{ "value": "Reading", "count": 520 }],
  "nationalities": [{ "value": "British", "count": 61 }]
}
```

Invalid parameters return `400 { "error": { "message": "…" } }`.

## Design notes

### Data model

Hobbies are normalized (`users`, `hobbies`, `user_hobbies`) so that "has all hobbies" and the hobby counts are plain SQL. There are indexes on each sort column paired with `id`, and on `user_hobbies(hobby_id, user_id)`.

### Age

The database stores `date_of_birth` (ISO `YYYY-MM-DD`), and the API calculates `age` when it responds, so ages never go stale. Sorting by age uses the indexed `date_of_birth` column in reverse: youngest first means the latest birth date first. This keeps the order exact and the pagination stable.

### Pagination

Pagination is keyset (cursor) based, on `(sort column, id)`, and `id` breaks ties. Each page continues strictly after the last row of the previous page. There are no duplicate or missing users, even when rows are added during scrolling, and deep pages are as fast as the first one.

### Filters

- Nationalities use `IN (…)`, so a user can match any selected nationality.
- Hobbies use `GROUP BY user_id HAVING COUNT(*) = n`, so a user must have all selected hobbies.
- Text, nationality and hobby filters are combined with `AND`.
- One `buildWhere()` helper builds the filter clause for both the list and the facets, so they can't drift apart.

### Facets follow the brief literally

Counts reflect every active filter, including the nationality filter itself. Once a nationality is selected, the nationality list only shows the selected ones. To widen the selection, remove that nationality first.

### Client state

The URL is the single source of truth: `?q=&nationality=&hobby=&sort=&dir=`.

- Default sort values are left out of the URL.
- The search box is debounced (300 ms) and uses `replace`, so typing doesn't fill the browser history.
- The query keys come from the URL state. Any change refetches both the user list and the sidebar facets.

### List

The list is virtualized with `@tanstack/react-virtual`. It shows one column, or two on wide screens, and loads the next page as you approach the end. While new results load after a filter change, the previous results stay visible but dimmed, and the list scrolls back to the top once the new results arrive.

### Loading, empty and error states

- Initial load shows skeleton cards.
- An inline spinner shows while refetching.
- When nothing matches, an empty state offers "Clear all filters".
- The list and the sidebar each have their own error state with a Retry button.
- If loading the next page fails, a retry option appears at the bottom of the list.

---

# Exercise brief

Build a small full-stack user directory application. The goal is to evaluate how you design a searchable, filterable, paginated UI backed by persisted data and clear API boundaries.

The application should include:

- A React client.
- A Node.js API server.
- A SQLite database used as the source of truth for user data.
- Docker configuration for running the application locally.

## Scenario

Users need to browse a large directory of people, search by name, and narrow results by nationality and hobbies. The filter sidebar should help users discover useful filters based on the result set they are currently viewing.

## Requirements

### Data Model

Seed a SQLite database with enough records to make pagination, infinite scroll, search, and filter counts meaningful.

Each user should have:

- `avatar`
- `first_name`
- `last_name`
- `age`
- `nationality`
- `hobbies`, from 0 to 10 hobbies per user

Choose a data model that supports the required behavior.

SQLite must be the persisted source of user data.

### API

Expose an API that supports:

- Paginated user results.
- Text filtering from user input across `first_name` and `last_name`.
- Filtering by one or more nationalities.
- Filtering by one or more hobbies.
- Sorting by `first_name`, `last_name`, `age`, and `nationality`.
- Pagination metadata so the client can determine whether more results are available.
- Top 20 hobbies for the active text filter and filter state, including `{ value, count }`.
- Top 20 nationalities for the active text filter and filter state, including `{ value, count }`.

The top 20 values and counts must reflect the currently applied text filter and selected filters, not the global dataset.

Filter semantics:

- Multiple selected hobbies should match users who have all selected hobbies.
- Multiple selected nationalities should match users from any selected nationality.
- Text, hobby, and nationality filters should apply together.

Sorting semantics:

- Sorted results must be deterministic. Use `id` as a final tie-breaker when values are equal.
- Pagination must respect the active sort without duplicate or missing users.

### Client

Build a React interface that includes:

- A text filter input for `first_name` and `last_name`.
- A virtualized, infinitely scrolling list of user cards.
- A sidebar containing the top 20 hobbies and top 20 nationalities for the current result set, including counts.
- Controls for applying and removing hobby and nationality filters.
- Controls for choosing sort field and sort direction.
- Loading, empty, and error states.
- A responsive layout that remains usable on desktop and mobile.

User cards should follow this structure:

```text
|----------------------------------|
| avatar      first_name+last_name |
|             nationality      age |
|                                  |
|             (2 hobbies) (+n)     |
|----------------------------------|
```

Show up to 2 hobbies on the card. If the user has more hobbies, display the remaining count as `+n`.

Use a virtual scroll implementation for the list.

When the text filter or selected filters change, the client must refresh both:

- The paginated user list.
- The top 20 hobbies and nationalities in the sidebar.

The text filter value, selected hobbies, selected nationalities, sort field, and sort direction must be reflected in the URL query string. Reloading or sharing the URL should restore the same view state.

## Implementation Notes

- Keep the database setup easy to run locally.
- Include seed logic or a documented command that creates the SQLite database.
- Include a `Dockerfile` and `docker-compose.yml` that can run the application locally.

## Evaluation Focus

We will pay particular attention to:

- Correct data persistence and API behavior.
- Correct filtering, sorting, pagination, and top 20 counts.
- Smooth infinite scrolling with virtualization.
- URL-synced state.
- Clear loading, empty, and error states.
- Easy local and Docker-based setup.

## Deliverables

Please provide:

- Source code for the React client and Node.js server.
- A `Dockerfile` and `docker-compose.yml`.
- Instructions for setup, database seeding, and running locally.
- Instructions for running with Docker Compose.
