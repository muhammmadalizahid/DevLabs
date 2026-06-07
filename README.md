This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## DevLab Architecture

DevLab uses a dual-database setup:

- Supabase: auth, users, classrooms, tests, questions, submissions, dataset metadata/cache.
- TiDB Cloud Starter: physical dataset tables and SQL query execution engine.

TiDB is the only dataset execution engine in this project.

## Required Environment Variables

Keep your existing Supabase auth/storage variables. Add these TiDB vars:

```bash
TIDB_HOST=
TIDB_PORT=4000
TIDB_USER=
TIDB_PASSWORD=
TIDB_DATABASE=devlabs_datasets
TIDB_SSL=true
```

Optional runtime controls:

```bash
EXEC_MAX_RESULT_ROWS=100
EXEC_MAX_RESULT_BYTES=524288
SUBMIT_QUERY_TIMEOUT_MS=5000
```

## DevLab Quickstart

1. Configure `.env.local` with Supabase + TiDB credentials.
2. Install dependencies: `npm ci`.
3. Apply Supabase migrations in `lib/db/migrations/`.
4. Start dev server: `npm run dev`.

Tests

- Unit tests: `npm run test:unit`
- Validator tests: `npm run test:validator`
- Integration queue tests: `npm run test:integration`

Worker & Redis

To run the execution worker with Redis locally:

```bash
docker compose up -d
npm ci
node scripts/worker-redis.js
```

Metrics

Prometheus-compatible metrics are exposed at `/api/metrics`.

Docs

See the `docs/` folder for feature-specific guides.

Deployment

- Apply Supabase migrations in `lib/db/migrations/` before enabling schema-dependent features.
- To apply migrations locally or to a Postgres instance, set `DATABASE_URL` and run:

```bash
npm run migrate
```

- Quick smoke tests (requires dev server running):

```bash
# scan a test
TEST_ID=<test-uuid> npm run smoke:plagiarism

# run a simple concurrent load test (defaults target to plagiarism scan URL)
TARGET_URL=http://localhost:3000/api/plagiarism/scan/<test-id> CONCURRENCY=20 REQS=200 npm run load:test
```

- Toggle features via environment variables (see `.env.example`).

## TiDB Health Check

Use:

```bash
GET /api/health/tidb
```

Response includes:

- `connected: true/false`
- `version` when connected

## Query Safety / RU Protection

Student SQL execution is restricted to a single `SELECT` and guarded by backend rules:

- no multi-statement execution
- blocked mutation/admin keywords
- result `LIMIT` enforced to max 100
- timeout + payload caps on responses
- dataset table metadata cached in Supabase (`dataset_tables`) to avoid expensive re-inspection

